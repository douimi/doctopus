'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { bookAppointment } from '@/lib/appointments/mutations';
import { bookAppointmentSchema } from '@/lib/appointments/schemas';
import {
  listPatientConsultationsForPicker,
  type FollowUpParentCandidate,
} from '@/lib/consultations/queries';
import type { BookState } from './types';

export async function bookAction(_: BookState, formData: FormData): Promise<BookState> {
  const session = await requireSession();
  const date = formData.get('date');
  const time = formData.get('time');
  if (typeof date !== 'string' || typeof time !== 'string') {
    return { error: 'Date ou heure manquante.' };
  }
  const local = new Date(`${date}T${time}`);
  if (Number.isNaN(local.getTime())) return { error: 'Date/heure invalide.' };
  const scheduledAt = local.toISOString();

  const parentRaw = formData.get('parentConsultationId');
  const parentConsultationId =
    typeof parentRaw === 'string' && parentRaw.length > 0 ? parentRaw : null;

  const parsed = bookAppointmentSchema.safeParse({
    patientId: formData.get('patientId'),
    scheduledAt,
    reason: formData.get('reason'),
    parentConsultationId,
  });
  if (!parsed.success) return { error: 'Données invalides.' };

  await bookAppointment(session.tenantId, session.userId, parsed.data);
  redirect('/today');
}

/**
 * Lazy fetch for the booking dialog's "C'est un suivi" picker. Called
 * client-side via a normal server-action invocation when the checkbox
 * is ticked — avoids the N+1 we'd otherwise need to pre-load every
 * patient row's history just in case.
 */
export async function listFollowUpParentCandidatesAction(
  patientId: string,
): Promise<FollowUpParentCandidate[]> {
  const session = await requireSession();
  const parsed = z.object({ patientId: z.string().uuid() }).safeParse({ patientId });
  if (!parsed.success) return [];
  return listPatientConsultationsForPicker(session.tenantId, parsed.data.patientId);
}
