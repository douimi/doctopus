'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { walkIn } from '@/lib/appointments/mutations';
import { walkInSchema } from '@/lib/appointments/schemas';
import { getLatestPrimaryConsultationForPatient } from '@/lib/consultations/queries';

/**
 * One-click "Mettre en salle d'attente" — fired from a per-row Button on
 * /today/walk-in. No motif: the doctor can edit it later from the
 * consultation. Redirects back to /today on success.
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
 * Walk-in flagged as a follow-up — same flow as walkInDirectAction but
 * looks up the patient's latest primary consultation and stores it as
 * the appointment's parent_consultation_id so that when the doctor
 * starts the consultation, it inherits the parent + the clinical
 * pre-fill (see startFromAppointment in lib/consultations/mutations).
 *
 * If the patient has no eligible parent (never seen them before),
 * silently falls back to a regular walk-in — the doctor sees the same
 * outcome as clicking "Mettre en salle" and isn't blocked on an
 * accidental click.
 */
export async function walkInFollowUpAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsedPatient = z
    .object({ patientId: z.string().uuid() })
    .safeParse({ patientId: formData.get('patientId') });
  if (!parsedPatient.success) return;

  const parent = await getLatestPrimaryConsultationForPatient(
    session.tenantId,
    parsedPatient.data.patientId,
  );

  await walkIn(session.tenantId, session.userId, {
    patientId: parsedPatient.data.patientId,
    parentConsultationId: parent?.id ?? null,
  });
  redirect('/today');
}
