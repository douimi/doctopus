'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { walkIn } from '@/lib/appointments/mutations';
import { walkInSchema } from '@/lib/appointments/schemas';

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
 * Walk-in flagged as a follow-up. Takes both the patient id AND the
 * specific parent consultation id the doctor picked in /today/walk-in/suivi,
 * stores it on the appointment so that when the consultation starts it
 * inherits the parent and the clinical pre-fill (see startFromAppointment).
 *
 * If the parent id is missing or invalid, silently falls back to a
 * regular walk-in — better to put the patient in the waiting room than
 * to bounce a doctor with a form error mid-rush.
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
