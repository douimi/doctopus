'use server';

import { redirect } from 'next/navigation';
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

export async function finalizeConsultationAction(formData: FormData) {
  const session = await requireDoctor();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return;
  await finalizeConsultation(session.tenantId, parsed.data.id);
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.finalize',
    entityType: 'consultation',
    entityId: parsed.data.id,
  });
  revalidatePath('/today');
  redirect('/today');
}
