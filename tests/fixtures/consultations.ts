import { dbAdmin } from '@/db/client';
import { consultations, consultationVitals } from '@/db/schema';

export async function seedConsultation(
  tenantId: string,
  appointmentId: string,
  patientId: string,
  doctorId: string,
  overrides: Partial<typeof consultations.$inferInsert> = {},
) {
  const [row] = await dbAdmin()
    .insert(consultations)
    .values({
      tenantId,
      appointmentId,
      patientId,
      doctorId,
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedVitals(
  tenantId: string,
  consultationId: string,
  overrides: Partial<typeof consultationVitals.$inferInsert> = {},
) {
  const [row] = await dbAdmin()
    .insert(consultationVitals)
    .values({ tenantId, consultationId, ...overrides })
    .returning();
  return row;
}
