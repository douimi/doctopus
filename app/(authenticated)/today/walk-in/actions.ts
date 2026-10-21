'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { walkIn } from '@/lib/appointments/mutations';
import { walkInSchema } from '@/lib/appointments/schemas';
import { getPatientById } from '@/lib/patients/queries';
import { firstIssueFr } from '@/lib/zod-fr';
import { frenchIssue } from '../../patients/form-errors';
import type { WalkInState } from '../book/types';

const WALK_IN_LABELS: Record<string, string> = {
  patientId: 'Patient',
  reason: 'Motif',
  parentConsultationId: 'Consultation parente',
};

/**
 * "Mettre en salle d'attente" from the walk-in dialog / page. Optional
 * motif and optional parent consultation (follow-up). Returns a state
 * instead of redirecting so the dialog over /today can close itself and
 * toast; the fallback page navigates client-side on success.
 */
export async function walkInAction(_: WalkInState, formData: FormData): Promise<WalkInState> {
  const session = await requireSession();
  const parentRaw = formData.get('parentConsultationId');
  const parsed = walkInSchema.safeParse({
    patientId: formData.get('patientId'),
    reason: formData.get('reason') ?? '',
    parentConsultationId:
      typeof parentRaw === 'string' && parentRaw.length > 0 ? parentRaw : null,
  }, { error: frenchIssue });
  if (!parsed.success) {
    return { ok: false, error: firstIssueFr(parsed.error, WALK_IN_LABELS), at: Date.now() };
  }
  const patient = await getPatientById(session.tenantId, parsed.data.patientId);
  if (!patient || patient.isArchived) {
    return { ok: false, error: 'Patient introuvable ou archivé.', at: Date.now() };
  }
  await walkIn(session.tenantId, session.userId, parsed.data);
  revalidatePath('/today');
  return {
    ok: true,
    error: null,
    at: Date.now(),
    patientName: `${patient.lastName} ${patient.firstName}`,
  };
}

/**
 * Legacy one-click walk-in (no motif). Kept so old links/bookmarks and
 * no-JS form posts still work; the UI now uses walkInAction.
 */
export async function walkInDirectAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = walkInSchema.safeParse({
    patientId: formData.get('patientId'),
  });
  if (!parsed.success) return;
  await walkIn(session.tenantId, session.userId, parsed.data);
  redirect('/today');
}

/**
 * Legacy walk-in flagged as a follow-up (patient + parent consultation).
 * Kept for compatibility; the UI now uses walkInAction with
 * `parentConsultationId`.
 */
export async function walkInFollowUpAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = z
    .object({
      patientId: z.string().uuid(),
      parentId: z.string().uuid().optional(),
    })
    .safeParse({
      patientId: formData.get('patientId'),
      parentId: formData.get('parentId') ?? undefined,
    });
  if (!parsed.success) return;

  await walkIn(session.tenantId, session.userId, {
    patientId: parsed.data.patientId,
    parentConsultationId: parsed.data.parentId ?? null,
  });
  redirect('/today');
}
