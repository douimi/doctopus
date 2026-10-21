'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { bookAppointment } from '@/lib/appointments/mutations';
import { bookAppointmentSchema } from '@/lib/appointments/schemas';
import {
  listPatientConsultationsForPicker,
  type FollowUpParentCandidate,
} from '@/lib/consultations/queries';
import { getPatientById } from '@/lib/patients/queries';
import { firstIssueFr } from '@/lib/zod-fr';
import { frenchIssue } from '../../patients/form-errors';
import type { BookState } from './types';

const BOOK_LABELS: Record<string, string> = {
  patientId: 'Patient',
  scheduledAt: 'Date et heure',
  reason: 'Motif',
  parentConsultationId: 'Consultation parente',
};

/**
 * Books a scheduled appointment. Returns a state (no redirect) so the
 * caller decides what happens next: the dialog over /today closes and
 * toasts, the patient file stays put, the fallback page navigates to
 * /today.
 */
export async function bookAction(_: BookState, formData: FormData): Promise<BookState> {
  const session = await requireSession();
  const date = formData.get('date');
  const time = formData.get('time');
  if (typeof date !== 'string' || typeof time !== 'string' || !date || !time) {
    return { ok: false, error: 'Choisissez une date et une heure.', at: Date.now() };
  }
  // Interpreted in the server's zone, same as the board renders it.
  const local = new Date(`${date}T${time}`);
  if (Number.isNaN(local.getTime())) {
    return { ok: false, error: 'Date ou heure invalide.', at: Date.now() };
  }
  const scheduledAt = local.toISOString();

  const parentRaw = formData.get('parentConsultationId');
  const parentConsultationId =
    typeof parentRaw === 'string' && parentRaw.length > 0 ? parentRaw : null;

  const parsed = bookAppointmentSchema.safeParse(
    {
      patientId: formData.get('patientId'),
      scheduledAt,
      reason: formData.get('reason') ?? '',
      parentConsultationId,
    },
    { error: frenchIssue },
  );
  if (!parsed.success) {
    return { ok: false, error: firstIssueFr(parsed.error, BOOK_LABELS), at: Date.now() };
  }

  const patient = await getPatientById(session.tenantId, parsed.data.patientId);
  if (!patient || patient.isArchived) {
    return { ok: false, error: 'Patient introuvable ou archivé.', at: Date.now() };
  }

  await bookAppointment(session.tenantId, session.userId, parsed.data);
  revalidatePath('/today');
  revalidatePath(`/patients/${parsed.data.patientId}`);
  return {
    ok: true,
    error: null,
    at: Date.now(),
    patientName: `${patient.lastName} ${patient.firstName}`,
  };
}

/**
 * Lazy fetch for the "C'est un suivi" picker in the booking and walk-in
 * forms. Called client-side when the checkbox is ticked — avoids
 * pre-loading every patient's history just in case.
 */
export async function listFollowUpParentCandidatesAction(
  patientId: string,
): Promise<FollowUpParentCandidate[]> {
  const session = await requireSession();
  const parsed = z.object({ patientId: z.string().uuid() }).safeParse({ patientId });
  if (!parsed.success) return [];
  return listPatientConsultationsForPicker(session.tenantId, parsed.data.patientId);
}
