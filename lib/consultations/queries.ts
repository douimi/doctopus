import 'server-only';
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  consultations,
  consultationVitals,
  patients,
  prescriptionItems,
  prescriptions,
  type Consultation,
  type ConsultationVitals,
} from '@/db/schema';

export type ConsultationDetail = {
  consultation: Consultation;
  vitals: ConsultationVitals | null;
};

export async function getConsultationById(
  tenantId: string,
  id: string,
): Promise<ConsultationDetail | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!c) return null;
    const [v] = await tx
      .select()
      .from(consultationVitals)
      .where(eq(consultationVitals.consultationId, id));
    return { consultation: c, vitals: v ?? null };
  });
}

export type FollowUpSibling = {
  id: string;
  consultedAt: Date;
  motif: string | null;
  isFinalized: boolean;
};

/**
 * Returns the parent (if this consultation is a follow-up) plus the
 * direct follow-up children (most-recent-first). Used by the
 * consultation page to render cross-links.
 */
export async function getConsultationFollowUpRelations(
  tenantId: string,
  consultation: Consultation,
): Promise<{ parent: FollowUpSibling | null; children: FollowUpSibling[] }> {
  return withTenantTx(tenantId, async (tx) => {
    let parent: FollowUpSibling | null = null;
    if (consultation.parentConsultationId) {
      const [p] = await tx
        .select({
          id: consultations.id,
          consultedAt: consultations.consultedAt,
          motif: consultations.motif,
          isFinalized: consultations.isFinalized,
        })
        .from(consultations)
        .where(eq(consultations.id, consultation.parentConsultationId));
      parent = p ?? null;
    }
    const children = await tx
      .select({
        id: consultations.id,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        isFinalized: consultations.isFinalized,
      })
      .from(consultations)
      .where(eq(consultations.parentConsultationId, consultation.id))
      .orderBy(desc(consultations.consultedAt));
    return { parent, children };
  });
}

export async function listConsultationsForPatient(
  tenantId: string,
  patientId: string,
): Promise<Consultation[]> {
  return withTenantTx(tenantId, async (tx) => {
    return tx
      .select()
      .from(consultations)
      .where(eq(consultations.patientId, patientId))
      .orderBy(desc(consultations.consultedAt));
  });
}

export type LatestHistoryNote = { consultationId: string; consultedAt: Date; text: string };

/**
 * Most recent non-empty per-consultation "history" note for a patient,
 * excluding the current consultation. Bridges the pre-0018 era where
 * antécédents were only written inside consultations, so the doctor can
 * pull them into the patient's record without digging.
 */
export async function getLatestHistoryNote(
  tenantId: string,
  patientId: string,
  excludeConsultationId?: string,
): Promise<LatestHistoryNote | null> {
  return withTenantTx(tenantId, async (tx) => {
    const conds: SQL[] = [
      eq(consultations.patientId, patientId),
      isNotNull(consultations.historyNotes),
      sql`btrim(${consultations.historyNotes}) <> ''`,
    ];
    if (excludeConsultationId) conds.push(sql`${consultations.id} <> ${excludeConsultationId}`);
    const [row] = await tx
      .select({
        consultationId: consultations.id,
        consultedAt: consultations.consultedAt,
        text: consultations.historyNotes,
      })
      .from(consultations)
      .where(and(...conds))
      .orderBy(desc(consultations.consultedAt))
      .limit(1);
    return row && row.text ? { ...row, text: row.text } : null;
  });
}

export type FollowUpParentCandidate = {
  id: string;
  consultedAt: Date;
  motif: string | null;
  isFinalized: boolean;
  isFollowUp: boolean;
};

/**
 * Lightweight list of a patient's consultations for the "pick a parent"
 * UX. Doesn't filter out follow-ups — chaining a follow-up to a previous
 * follow-up is rare but legitimate (post-control control), and the
 * doctor sees a "Suivi" tag on those rows in the picker.
 */
export async function listPatientConsultationsForPicker(
  tenantId: string,
  patientId: string,
  opts: { limit?: number } = {},
): Promise<FollowUpParentCandidate[]> {
  const limit = Math.min(opts.limit ?? 25, 100);
  return withTenantTx(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: consultations.id,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        isFinalized: consultations.isFinalized,
        parentConsultationId: consultations.parentConsultationId,
      })
      .from(consultations)
      .where(eq(consultations.patientId, patientId))
      .orderBy(desc(consultations.consultedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      consultedAt: r.consultedAt,
      motif: r.motif,
      isFinalized: r.isFinalized,
      isFollowUp: r.parentConsultationId !== null,
    }));
  });
}

export async function getOpenConsultationForAppointment(
  tenantId: string,
  appointmentId: string,
): Promise<Consultation | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.appointmentId, appointmentId));
    return row ?? null;
  });
}

export type ConsultationListRow = {
  id: string;
  patientId: string;
  patientFullName: string;
  consultedAt: Date;
  motif: string | null;
  isFinalized: boolean;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  priceMad: string | null;
};

const ESCAPE_PATTERN = /[\\%_]/g;
function escapeIlike(input: string): string {
  return input.replace(ESCAPE_PATTERN, (m) => '\\' + m);
}

export async function listConsultations(
  tenantId: string,
  query: string,
  opts: { limit?: number } = {},
): Promise<ConsultationListRow[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const trimmed = query.trim();
  return withTenantTx(tenantId, async (tx) => {
    const where = trimmed
      ? or(
          ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
          ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
        )
      : undefined;
    const rows = await tx
      .select({
        id: consultations.id,
        patientId: consultations.patientId,
        lastName: patients.lastName,
        firstName: patients.firstName,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        isFinalized: consultations.isFinalized,
        paymentStatus: consultations.paymentStatus,
        priceMad: consultations.priceMad,
      })
      .from(consultations)
      .innerJoin(patients, eq(patients.id, consultations.patientId))
      .where(where)
      .orderBy(desc(consultations.consultedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientFullName: `${r.lastName} ${r.firstName}`.trim(),
      consultedAt: r.consultedAt,
      motif: r.motif,
      isFinalized: r.isFinalized,
      paymentStatus: r.paymentStatus as 'awaiting' | 'paid' | 'free',
      priceMad: r.priceMad,
    }));
  });
}

export type ConsultationPage = {
  rows: ConsultationListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ConsultationSort = 'patient' | 'consultedAt' | 'status';
export type ConsultationSortDir = 'asc' | 'desc';

function consultationOrderBy(
  sort: ConsultationSort,
  dir: ConsultationSortDir,
): SQL[] {
  const direction = dir === 'asc' ? asc : desc;
  if (sort === 'patient') {
    return [direction(patients.lastName), direction(patients.firstName)];
  }
  if (sort === 'status') {
    // Treat draft → awaiting → paid → free as the natural lifecycle.
    // Postgres sorts text alphabetically so we lean on an expression.
    return [
      direction(consultations.isFinalized),
      direction(consultations.paymentStatus),
      desc(consultations.consultedAt),
    ];
  }
  return [direction(consultations.consultedAt)];
}

/**
 * Paginated variant of listConsultations. `page` is 1-indexed; out-of-
 * range pages clamp to a valid value. Same patient-name search as the
 * non-paginated version. Default sort: most recent consultedAt first.
 */
export async function listConsultationsPage(
  tenantId: string,
  query: string,
  opts: {
    page?: number;
    pageSize?: number;
    sort?: ConsultationSort;
    dir?: ConsultationSortDir;
  } = {},
): Promise<ConsultationPage> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
  const sort = opts.sort ?? 'consultedAt';
  const dir = opts.dir ?? 'desc';
  const orderBy = consultationOrderBy(sort, dir);
  const trimmed = query.trim();

  return withTenantTx(tenantId, async (tx) => {
    const where = trimmed
      ? or(
          ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
          ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
        )
      : undefined;

    const [{ count }] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(consultations)
      .innerJoin(patients, eq(patients.id, consultations.patientId))
      .where(where);

    const total = Number(count) || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
    const offset = (page - 1) * pageSize;

    const rows = await tx
      .select({
        id: consultations.id,
        patientId: consultations.patientId,
        lastName: patients.lastName,
        firstName: patients.firstName,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        isFinalized: consultations.isFinalized,
        paymentStatus: consultations.paymentStatus,
        priceMad: consultations.priceMad,
      })
      .from(consultations)
      .innerJoin(patients, eq(patients.id, consultations.patientId))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        patientFullName: `${r.lastName} ${r.firstName}`.trim(),
        consultedAt: r.consultedAt,
        motif: r.motif,
        isFinalized: r.isFinalized,
        paymentStatus: r.paymentStatus as 'awaiting' | 'paid' | 'free',
        priceMad: r.priceMad,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  });
}

/**
 * Paginated list of follow-ups — consultations whose
 * parent_consultation_id is not null. Same shape as listConsultationsPage
 * (so the same UI components render it) but filtered down to the
 * follow-up rows for the dedicated /suivis section.
 */
export async function listFollowUpsPage(
  tenantId: string,
  query: string,
  opts: {
    page?: number;
    pageSize?: number;
    sort?: ConsultationSort;
    dir?: ConsultationSortDir;
  } = {},
): Promise<ConsultationPage> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
  const sort = opts.sort ?? 'consultedAt';
  const dir = opts.dir ?? 'desc';
  const orderBy = consultationOrderBy(sort, dir);
  const trimmed = query.trim();

  return withTenantTx(tenantId, async (tx) => {
    const followUpOnly = isNotNull(consultations.parentConsultationId);
    const where = trimmed
      ? and(
          followUpOnly,
          or(
            ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
            ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
          ),
        )
      : followUpOnly;

    const [{ count }] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(consultations)
      .innerJoin(patients, eq(patients.id, consultations.patientId))
      .where(where);

    const total = Number(count) || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
    const offset = (page - 1) * pageSize;

    const rows = await tx
      .select({
        id: consultations.id,
        patientId: consultations.patientId,
        lastName: patients.lastName,
        firstName: patients.firstName,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        isFinalized: consultations.isFinalized,
        paymentStatus: consultations.paymentStatus,
        priceMad: consultations.priceMad,
      })
      .from(consultations)
      .innerJoin(patients, eq(patients.id, consultations.patientId))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        patientFullName: `${r.lastName} ${r.firstName}`.trim(),
        consultedAt: r.consultedAt,
        motif: r.motif,
        isFinalized: r.isFinalized,
        paymentStatus: r.paymentStatus as 'awaiting' | 'paid' | 'free',
        priceMad: r.priceMad,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  });
}

/**
 * Most recent non-follow-up consultation for a patient. Used by the
 * manual follow-up creation flow on /suivis/new to auto-pick the parent
 * (the doctor wouldn't normally chain a follow-up onto another
 * follow-up — they want the original visit).
 *
 * Returns null when the patient has no eligible parent yet.
 */
export async function getLatestPrimaryConsultationForPatient(
  tenantId: string,
  patientId: string,
): Promise<{ id: string; consultedAt: Date; motif: string | null } | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: consultations.id,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
      })
      .from(consultations)
      .where(
        and(
          eq(consultations.patientId, patientId),
          isNull(consultations.parentConsultationId),
        ),
      )
      .orderBy(desc(consultations.consultedAt))
      .limit(1);
    return row ?? null;
  });
}

export type PatientTimelineRx = {
  label: string;
  posologie: string | null;
  duration: string | null;
};

export type PatientTimelineEntry = {
  id: string;
  consultedAt: Date;
  motif: string | null;
  diagnosis: string | null;
  isFinalized: boolean;
  parentConsultationId: string | null;
  vitals: ConsultationVitals | null;
  rx: PatientTimelineRx[];
};

/**
 * The patient's other consultations (most recent first), each with its
 * vitals and prescription lines — the consultation page's "Historique"
 * and the previous-visit vitals hint. Read-only; `total` counts every
 * other consultation so the UI can link to the full file.
 */
export async function listPatientTimeline(
  tenantId: string,
  patientId: string,
  opts: { excludeConsultationId?: string; limit?: number } = {},
): Promise<{ entries: PatientTimelineEntry[]; total: number }> {
  const limit = Math.min(opts.limit ?? 5, 25);
  return withTenantTx(tenantId, async (tx) => {
    const conds: SQL[] = [eq(consultations.patientId, patientId)];
    if (opts.excludeConsultationId) {
      conds.push(sql`${consultations.id} <> ${opts.excludeConsultationId}`);
    }
    const where = and(...conds);
    const [{ count }] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(consultations)
      .where(where);
    const rows = await tx
      .select({
        id: consultations.id,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        diagnosis: consultations.diagnosis,
        isFinalized: consultations.isFinalized,
        parentConsultationId: consultations.parentConsultationId,
      })
      .from(consultations)
      .where(where)
      .orderBy(desc(consultations.consultedAt))
      .limit(limit);
    if (rows.length === 0) return { entries: [], total: Number(count) || 0 };

    const ids = rows.map((r) => r.id);
    const vitals = await tx
      .select()
      .from(consultationVitals)
      .where(inArray(consultationVitals.consultationId, ids));
    const rxRows = await tx
      .select({
        consultationId: prescriptions.consultationId,
        label: prescriptionItems.medicationLabelSnapshot,
        posologie: prescriptionItems.posologie,
        duration: prescriptionItems.duration,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(inArray(prescriptions.consultationId, ids))
      .orderBy(asc(prescriptionItems.position));

    const vitalsById = new Map(vitals.map((v) => [v.consultationId, v]));
    const rxById = new Map<string, PatientTimelineRx[]>();
    for (const r of rxRows) {
      const list = rxById.get(r.consultationId) ?? [];
      list.push({ label: r.label, posologie: r.posologie, duration: r.duration });
      rxById.set(r.consultationId, list);
    }
    return {
      entries: rows.map((r) => ({
        ...r,
        vitals: vitalsById.get(r.id) ?? null,
        rx: rxById.get(r.id) ?? [],
      })),
      total: Number(count) || 0,
    };
  });
}
