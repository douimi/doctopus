import { dbAdmin } from '@/db/client';
import { appointments } from '@/db/schema';

export async function seedAppointment(
  tenantId: string,
  patientId: string,
  createdBy: string,
  overrides: Partial<typeof appointments.$inferInsert> = {},
) {
  const [row] = await dbAdmin()
    .insert(appointments)
    .values({
      tenantId,
      patientId,
      createdBy,
      status: overrides.status ?? 'scheduled',
      kind: overrides.kind ?? 'scheduled',
      scheduledAt: overrides.scheduledAt ?? new Date(Date.now() + 3_600_000),
      ...overrides,
    })
    .returning();
  return row;
}
