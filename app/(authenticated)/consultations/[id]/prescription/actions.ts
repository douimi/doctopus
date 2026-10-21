'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireDoctor } from '@/lib/auth/guards';
import {
  addItemSchema,
  itemIdSchema,
  reorderSchema,
  updateItemSchema,
  type AddItemInput,
  type ReorderInput,
  type UpdateItemInput,
} from '@/lib/prescriptions/schemas';
import {
  addPrescriptionItem,
  removePrescriptionItem,
  reorderPrescriptionItem,
  updatePrescriptionItem,
} from '@/lib/prescriptions/mutations';
import { recordAudit } from '@/lib/audit/record';
import { firstIssueFr } from '@/lib/zod-fr';

/**
 * Every prescription action reports failures to the editor instead of
 * returning silently — the doctor must know when a line wasn't saved.
 */
export type PrescriptionActionResult = { ok: boolean; error?: string };

const PRESCRIPTION_LABELS: Record<string, string> = {
  label: 'Médicament',
  posologie: 'Posologie',
  duration: 'Durée',
  quantity: 'Quantité',
  instructions: 'Notes',
  medicationMetadata: 'Médicament',
  medicationEan13: 'Médicament',
};

const consultationIdSchema = z.string().uuid();

function invalid(error: z.ZodError): PrescriptionActionResult {
  return { ok: false, error: firstIssueFr(error, PRESCRIPTION_LABELS) };
}

export async function addItemAction(input: AddItemInput): Promise<PrescriptionActionResult> {
  const session = await requireDoctor();
  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await addPrescriptionItem(session.tenantId, session.userId, parsed.data);
  } catch (e) {
    console.error('[addItemAction] failed', e);
    return { ok: false, error: "Impossible d'ajouter le médicament. Réessayez." };
  }
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'prescription.item_added',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
    metadata: { medicationEan13: parsed.data.medicationEan13 || null },
  });
  revalidatePath(`/consultations/${parsed.data.consultationId}`);
  return { ok: true };
}

export async function updateItemAction(
  consultationId: string,
  input: UpdateItemInput,
): Promise<PrescriptionActionResult> {
  const session = await requireDoctor();
  const cid = consultationIdSchema.safeParse(consultationId);
  if (!cid.success) return { ok: false, error: 'Consultation invalide.' };
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ok = await updatePrescriptionItem(session.tenantId, parsed.data);
  if (!ok) return { ok: false, error: 'Médicament introuvable (déjà retiré ?).' };
  revalidatePath(`/consultations/${cid.data}`);
  return { ok: true };
}

export async function removeItemAction(
  consultationId: string,
  itemId: string,
): Promise<PrescriptionActionResult> {
  const session = await requireDoctor();
  const cid = consultationIdSchema.safeParse(consultationId);
  if (!cid.success) return { ok: false, error: 'Consultation invalide.' };
  const parsed = itemIdSchema.safeParse({ itemId });
  if (!parsed.success) return invalid(parsed.error);
  const ok = await removePrescriptionItem(session.tenantId, parsed.data.itemId);
  if (!ok) return { ok: false, error: 'Médicament introuvable (déjà retiré ?).' };
  revalidatePath(`/consultations/${cid.data}`);
  return { ok: true };
}

export async function reorderItemAction(
  consultationId: string,
  input: ReorderInput,
): Promise<PrescriptionActionResult> {
  const session = await requireDoctor();
  const cid = consultationIdSchema.safeParse(consultationId);
  if (!cid.success) return { ok: false, error: 'Consultation invalide.' };
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ok = await reorderPrescriptionItem(
    session.tenantId,
    parsed.data.itemId,
    parsed.data.direction,
  );
  if (!ok) return { ok: false, error: 'Impossible de déplacer ce médicament.' };
  revalidatePath(`/consultations/${cid.data}`);
  return { ok: true };
}
