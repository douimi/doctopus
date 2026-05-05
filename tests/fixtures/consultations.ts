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
      // Default price ensures the row satisfies the
      // consultations_awaiting_requires_priced_nonfree CHECK introduced
      // in migration 0007. Override priceMad/isFree/paymentStatus when a
      // test cares about a specific pricing scenario.
      priceMad: '300.00',
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
