import 'server-only';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { patients, patientAllergies, patientChronicConditions } from '@/db/schema';

export type PatientSort = 'name' | 'created';
export type PatientSortDir = 'asc' | 'desc';

export type PatientListRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  cin: string | null;
  dateOfBirth: string | null;
  isArchived: boolean;
};

const ESCAPE_PATTERN = /[\\%_]/g;
function escapeIlike(input: string): string {
  return input.replace(ESCAPE_PATTERN, (m) => '\\' + m);
}

export async function searchPatients(
  tenantId: string,
  query: string,
  opts: { includeArchived?: boolean; limit?: number } = {},
): Promise<PatientListRow[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const trimmed = query.trim();
  return withTenantTx(tenantId, async (tx) => {
    const where = trimmed
      ? and(
          opts.includeArchived ? undefined : eq(patients.isArchived, false),
          or(
            ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
            ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
            ilike(patients.phone, `%${escapeIlike(trimmed)}%`),
            ilike(patients.cin, `%${escapeIlike(trimmed)}%`),
          ),
        )
      : opts.includeArchived
      ? undefined
      : eq(patients.isArchived, false);

    const rows = await tx
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        cin: patients.cin,
        dateOfBirth: patients.dateOfBirth,
        isArchived: patients.isArchived,
      })
      .from(patients)
      .where(where)
      .orderBy(desc(patients.createdAt))
      .limit(limit);
    return rows;
  });
}

export type PatientPage = {
  rows: PatientListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Paginated variant of searchPatients. Returns the slice plus the total
 * row count for the current filter so the caller can render pagination
 * controls. `page` is 1-indexed; out-of-range pages clamp to a valid value.
 *
 * Default sort is alphabetical by lastName ASC, firstName ASC — the
 * natural order for a cabinet looking up an existing patient. Pass
 * `sort: 'created'` for "most recent first" (useful right after an
 * import to see what just landed).
 */
export async function searchPatientsPage(
  tenantId: string,
  query: string,
  opts: {
    includeArchived?: boolean;
    page?: number;
    pageSize?: number;
    sort?: PatientSort;
    dir?: PatientSortDir;
  } = {},
): Promise<PatientPage> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
  const sort: PatientSort = opts.sort ?? 'name';
  const dir: PatientSortDir = opts.dir ?? (sort === 'created' ? 'desc' : 'asc');
  const trimmed = query.trim();

  const orderBy: SQL[] =
    sort === 'created'
      ? [dir === 'asc' ? asc(patients.createdAt) : desc(patients.createdAt)]
      : dir === 'asc'
        ? [asc(patients.lastName), asc(patients.firstName)]
        : [desc(patients.lastName), desc(patients.firstName)];

  return withTenantTx(tenantId, async (tx) => {
    const where = trimmed
      ? and(
          opts.includeArchived ? undefined : eq(patients.isArchived, false),
          or(
            ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
            ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
            ilike(patients.phone, `%${escapeIlike(trimmed)}%`),
            ilike(patients.cin, `%${escapeIlike(trimmed)}%`),
          ),
        )
      : opts.includeArchived
      ? undefined
      : eq(patients.isArchived, false);

    const [{ count }] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(patients)
      .where(where);

    const total = Number(count) || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
    const offset = (page - 1) * pageSize;

    const rows = await tx
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        cin: patients.cin,
        dateOfBirth: patients.dateOfBirth,
        isArchived: patients.isArchived,
      })
      .from(patients)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);

    return { rows, total, page, pageSize, totalPages };
  });
}

export async function getPatientById(tenantId: string, id: string) {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx.select().from(patients).where(eq(patients.id, id));
    return row ?? null;
  });
}

export async function getPatientDetail(tenantId: string, id: string) {
  return withTenantTx(tenantId, async (tx) => {
    const [patient] = await tx.select().from(patients).where(eq(patients.id, id));
    if (!patient) return null;
    const allergies = await tx
      .select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, id))
      .orderBy(patientAllergies.label);
    const conditions = await tx
      .select()
      .from(patientChronicConditions)
      .where(eq(patientChronicConditions.patientId, id))
      .orderBy(patientChronicConditions.label);
    return { patient, allergies, conditions };
  });
}
