import { dbAdmin } from '@/db/client';
import { patients, patientAllergies, patientChronicConditions } from '@/db/schema';

export async function seedPatient(
  tenantId: string,
  overrides: Partial<typeof patients.$inferInsert> = {},
) {
  const [row] = await dbAdmin().insert(patients).values({
    tenantId,
    firstName: overrides.firstName ?? 'Ahmed',
    lastName: overrides.lastName ?? 'Bennani',
    gender: overrides.gender ?? 'm',
    dateOfBirth: overrides.dateOfBirth ?? '1985-03-12',
    phone: overrides.phone ?? '+212600000001',
    ...overrides,
  }).returning();
  return row;
}

export async function seedAllergy(tenantId: string, patientId: string, label: string) {
  const [row] = await dbAdmin()
    .insert(patientAllergies)
    .values({ tenantId, patientId, label })
    .returning();
  return row;
}

export async function seedChronicCondition(tenantId: string, patientId: string, label: string) {
  const [row] = await dbAdmin()
    .insert(patientChronicConditions)
    .values({ tenantId, patientId, label })
    .returning();
  return row;
}
