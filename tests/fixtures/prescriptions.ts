import { dbAdmin } from '@/db/client';
import { prescriptions, prescriptionItems } from '@/db/schema';

export async function seedPrescription(
  tenantId: string,
  consultationId: string,
  patientId: string,
  doctorId: string,
) {
  const [row] = await dbAdmin()
    .insert(prescriptions)
    .values({ tenantId, consultationId, patientId, doctorId })
    .returning();
  return row;
}

export async function seedPrescriptionItem(
  tenantId: string,
  prescriptionId: string,
  overrides: Partial<typeof prescriptionItems.$inferInsert> = {},
) {
  const [row] = await dbAdmin()
    .insert(prescriptionItems)
    .values({
      tenantId,
      prescriptionId,
      position: overrides.position ?? 0,
      medicationLabelSnapshot: overrides.medicationLabelSnapshot ?? 'Doliprane 1000 mg comprimé',
      ...overrides,
    })
    .returning();
  return row;
}
