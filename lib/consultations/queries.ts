import 'server-only';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  consultations,
  consultationVitals,
  patients,
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

/**
 * Paginated variant of listConsultations. `page` is 1-indexed; out-of-
 * range pages clamp to a valid value. Same ordering (most recent first)
 * and same patient-name search as the non-paginated version.
 */
export async function listConsultationsPage(
  tenantId: string,
  query: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<ConsultationPage> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
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
      .orderBy(desc(consultations.consultedAt))
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
