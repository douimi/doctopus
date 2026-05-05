'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireDoctor } from '@/lib/auth/guards';
import { sectionsUpdateSchema, vitalsUpdateSchema } from '@/lib/consultations/schemas';
import {
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
  if (!ok) return { ok: false, error: 'Consultation finalisée ou introuvable.' };
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
  if (!ok) return { ok: false, error: 'Consultation finalisée ou introuvable.' };
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

  const ok = await finalizeConsultation(session.tenantId, parsed.data.consultationId, {
    isFree: parsed.data.isFree,
    priceMad: parsed.data.isFree ? undefined : parsed.data.priceMad,
    doctorId: session.userId,
  });
  if (!ok) return { ok: false, error: 'Consultation déjà finalisée ou introuvable.' };

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
  return { ok: true };
}
