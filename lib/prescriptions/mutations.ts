import 'server-only';
import { asc, eq, max } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  consultations,
  prescriptions,
  prescriptionItems,
  type PrescriptionItem,
} from '@/db/schema';
import type { dbUser } from '@/db/client';
import type { AddItemInput, UpdateItemInput } from './schemas';

type Tx = Parameters<Parameters<ReturnType<typeof dbUser>['transaction']>[0]>[0];

async function ensurePrescriptionFor(
  tx: Tx,
  tenantId: string,
  consultationId: string,
  doctorId: string,
) {
  const [existing] = await tx
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.consultationId, consultationId));
  if (existing) return existing;

  const [c] = await tx.select().from(consultations).where(eq(consultations.id, consultationId));
  if (!c) throw new Error('Consultation not found');

  const [created] = await tx
    .insert(prescriptions)
    .values({
      tenantId,
      consultationId,
      patientId: c.patientId,
      doctorId,
    })
    .returning();
  return created;
}

export async function addPrescriptionItem(
  tenantId: string,
  doctorId: string,
  input: AddItemInput,
): Promise<PrescriptionItem> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.id, input.consultationId));
    if (!c || c.isFinalized) throw new Error('Consultation introuvable ou finalisée');

    const pres = await ensurePrescriptionFor(tx, tenantId, input.consultationId, doctorId);

    const [posRow] = await tx
      .select({ m: max(prescriptionItems.position) })
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, pres.id));
    const nextPos = (posRow?.m ?? -1) + 1;

    const [created] = await tx
      .insert(prescriptionItems)
      .values({
        tenantId,
        prescriptionId: pres.id,
        position: nextPos,
        medicationId:
          input.medicationId && input.medicationId.length > 0 ? input.medicationId : null,
        medicationLabelSnapshot: input.label,
        posologie: input.posologie || null,
        duration: input.duration || null,
        quantity: input.quantity || null,
        instructions: input.instructions || null,
      })
      .returning();
    return created;
  });
}

export async function updatePrescriptionItem(
  tenantId: string,
  input: UpdateItemInput,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const result = await tx
      .update(prescriptionItems)
      .set({
        posologie: input.posologie || null,
        duration: input.duration || null,
        quantity: input.quantity || null,
        instructions: input.instructions || null,
        updatedAt: new Date(),
      })
      .where(eq(prescriptionItems.id, input.itemId))
      .returning({ id: prescriptionItems.id });
    return result.length > 0;
  });
}

export async function removePrescriptionItem(
  tenantId: string,
  itemId: string,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const result = await tx
      .delete(prescriptionItems)
      .where(eq(prescriptionItems.id, itemId))
      .returning({ id: prescriptionItems.id, prescriptionId: prescriptionItems.prescriptionId });
    if (result.length === 0) return false;
    const remaining = await tx
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, result[0].prescriptionId))
      .orderBy(asc(prescriptionItems.position));
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await tx
          .update(prescriptionItems)
          .set({ position: i })
          .where(eq(prescriptionItems.id, remaining[i].id));
      }
    }
    return true;
  });
}

export async function reorderPrescriptionItem(
  tenantId: string,
  itemId: string,
  direction: 'up' | 'down',
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [item] = await tx
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.id, itemId));
    if (!item) return false;

    const siblings = await tx
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, item.prescriptionId))
      .orderBy(asc(prescriptionItems.position));

    const idx = siblings.findIndex((s) => s.id === item.id);
    if (idx < 0) return false;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return false;

    const other = siblings[targetIdx];
    const tmp = -1 - item.position;

    await tx
      .update(prescriptionItems)
      .set({ position: tmp })
      .where(eq(prescriptionItems.id, item.id));
    await tx
      .update(prescriptionItems)
      .set({ position: item.position })
      .where(eq(prescriptionItems.id, other.id));
    await tx
      .update(prescriptionItems)
      .set({ position: other.position })
      .where(eq(prescriptionItems.id, item.id));

    return true;
  });
}
