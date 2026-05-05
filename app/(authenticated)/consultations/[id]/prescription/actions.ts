'use server';

import { revalidatePath } from 'next/cache';
import { requireDoctor } from '@/lib/auth/guards';
import {
  addItemSchema,
  itemIdSchema,
  reorderSchema,
  updateItemSchema,
} from '@/lib/prescriptions/schemas';
import {
  addPrescriptionItem,
  removePrescriptionItem,
  reorderPrescriptionItem,
  updatePrescriptionItem,
} from '@/lib/prescriptions/mutations';
import { recordAudit } from '@/lib/audit/record';

export async function addItemActionFromForm(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsed = addItemSchema.safeParse({
    consultationId: formData.get('consultationId'),
    medicationEan13: formData.get('medicationEan13'),
    medicationMetadata: formData.get('medicationMetadata'),
    label: formData.get('label'),
    posologie: formData.get('posologie'),
    duration: formData.get('duration'),
    quantity: formData.get('quantity'),
    instructions: formData.get('instructions'),
  });
  if (!parsed.success) return;
  await addPrescriptionItem(session.tenantId, session.userId, parsed.data);
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'prescription.item_added',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
    metadata: { medicationEan13: parsed.data.medicationEan13 || null },
  });
  revalidatePath(`/consultations/${parsed.data.consultationId}`);
}

export async function updateItemAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsed = updateItemSchema.safeParse({
    itemId: formData.get('itemId'),
    posologie: formData.get('posologie'),
    duration: formData.get('duration'),
    quantity: formData.get('quantity'),
    instructions: formData.get('instructions'),
  });
  const consultationId = formData.get('consultationId');
  if (!parsed.success || typeof consultationId !== 'string') return;
  await updatePrescriptionItem(session.tenantId, parsed.data);
  revalidatePath(`/consultations/${consultationId}`);
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsed = itemIdSchema.safeParse({ itemId: formData.get('itemId') });
  const consultationId = formData.get('consultationId');
  if (!parsed.success || typeof consultationId !== 'string') return;
  await removePrescriptionItem(session.tenantId, parsed.data.itemId);
  revalidatePath(`/consultations/${consultationId}`);
}

export async function reorderItemAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsed = reorderSchema.safeParse({
    itemId: formData.get('itemId'),
    direction: formData.get('direction'),
  });
  const consultationId = formData.get('consultationId');
  if (!parsed.success || typeof consultationId !== 'string') return;
  await reorderPrescriptionItem(session.tenantId, parsed.data.itemId, parsed.data.direction);
  revalidatePath(`/consultations/${consultationId}`);
}
