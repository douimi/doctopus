'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireDoctor } from '@/lib/auth/guards';
import { sectionsUpdateSchema, vitalsUpdateSchema } from '@/lib/consultations/schemas';
import {
  createFollowUpConsultation,
  deleteConsultation,
  finalizeConsultation,
  updateConsultationSections,
  updateConsultationVitals,
} from '@/lib/consultations/mutations';
import { recordAudit } from '@/lib/audit/record';
import { finalizePricingSchema } from '@/lib/payments/schemas';

const idSchema = z.object({ id: z.string().uuid() });

export type SaveResult = { ok: boolean; error?: string };

export async function saveSectionsAction(
  id: string,
  data: z.infer<typeof sectionsUpdateSchema>,
): Promise<SaveResult> {
  const session = await requireDoctor();
  const parsedId = idSchema.safeParse({ id });
  const parsed = sectionsUpdateSchema.safeParse(data);
  if (!parsedId.success || !parsed.success) return { ok: false, error: 'Données invalides.' };
  const ok = await updateConsultationSections(session.tenantId, parsedId.data.id, parsed.data);
  if (!ok) return { ok: false, error: 'Consultation introuvable.' };
  return { ok: true };
}

export async function saveVitalsAction(
  id: string,
  data: z.infer<typeof vitalsUpdateSchema>,
): Promise<SaveResult> {
  const session = await requireDoctor();
  const parsedId = idSchema.safeParse({ id });
  const parsed = vitalsUpdateSchema.safeParse(data);
  if (!parsedId.success || !parsed.success) return { ok: false, error: 'Données invalides.' };
  const ok = await updateConsultationVitals(session.tenantId, parsedId.data.id, parsed.data);
  if (!ok) return { ok: false, error: 'Consultation introuvable.' };
  return { ok: true };
}

export type FinalizeResult = { ok: boolean; error?: string };

export async function finalizeConsultationAction(formData: FormData): Promise<FinalizeResult> {
  const session = await requireDoctor();
  const parsed = finalizePricingSchema.safeParse({
    consultationId: formData.get('consultationId'),
    isFree: formData.get('isFree') === 'true',
    priceMad: (formData.get('priceMad') as string | null) ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const outcome = await finalizeConsultation(session.tenantId, parsed.data.consultationId, {
    isFree: parsed.data.isFree,
    priceMad: parsed.data.isFree ? undefined : parsed.data.priceMad,
    doctorId: session.userId,
  });
  if (outcome === 'not_found') {
    return { ok: false, error: 'Consultation introuvable.' };
  }
  if (outcome === 'already_finalized') {
    return { ok: false, error: 'Consultation déjà finalisée.' };
  }

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.price_set',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
    metadata: { priceMad: parsed.data.priceMad ?? null, isFree: parsed.data.isFree },
  });
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.finalize',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
  });

  revalidatePath('/today');
  // Without this, the consultation page's cached server render still
  // shows the "Terminer la consultation" trigger button instead of the
  // FinalizedTarificationBadge after the action returns — the dialog
  // closes but the button stays clickable until a hard refresh.
  revalidatePath(`/consultations/${parsed.data.consultationId}`);
  return { ok: true };
}

export async function createFollowUpAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsedId = idSchema.safeParse({ id: formData.get('parentId') });
  if (!parsedId.success) return;

  const created = await createFollowUpConsultation(
    session.tenantId,
    parsedId.data.id,
    session.userId,
  );
  if (!created) return;

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.followup_create',
    entityType: 'consultation',
    entityId: created.id,
    metadata: { parentConsultationId: parsedId.data.id },
  });

  revalidatePath(`/consultations/${parsedId.data.id}`);
  redirect(`/consultations/${created.id}`);
}

export async function deleteConsultationAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsedId = idSchema.safeParse({ id: formData.get('id') });
  if (!parsedId.success) {
    // Form submission — there's no UI surface to show this; bail silently.
    return;
  }
  const ok = await deleteConsultation(session.tenantId, parsedId.data.id);
  if (!ok) return;

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.delete',
    entityType: 'consultation',
    entityId: parsedId.data.id,
  });

  revalidatePath('/consultations');
  revalidatePath('/today');
  redirect('/consultations');
}
