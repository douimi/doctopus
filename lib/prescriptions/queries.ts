import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  prescriptions,
  prescriptionItems,
  type Prescription,
  type PrescriptionItem,
} from '@/db/schema';

export type PrescriptionDetail = {
  prescription: Prescription;
  items: PrescriptionItem[];
};

export async function getPrescriptionForConsultation(
  tenantId: string,
  consultationId: string,
): Promise<PrescriptionDetail | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [pres] = await tx
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.consultationId, consultationId));
    if (!pres) return null;
    const items = await tx
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, pres.id))
      .orderBy(asc(prescriptionItems.position));
    return { prescription: pres, items };
  });
}

export async function getPrescriptionDetail(
  tenantId: string,
  prescriptionId: string,
): Promise<PrescriptionDetail | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [pres] = await tx
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId));
    if (!pres) return null;
    const items = await tx
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, prescriptionId))
      .orderBy(asc(prescriptionItems.position));
    return { prescription: pres, items };
  });
}
