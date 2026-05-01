import 'server-only';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { patients, patientAllergies, patientChronicConditions } from '@/db/schema';

export type PatientListRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  cin: string | null;
  dateOfBirth: string;
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
