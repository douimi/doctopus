'use server';

import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { bookAppointment } from '@/lib/appointments/mutations';
import { bookAppointmentSchema } from '@/lib/appointments/schemas';
import { getLatestPrimaryConsultationForPatient } from '@/lib/consultations/queries';
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

  const isFollowUp = formData.get('isFollowUp') === 'true';
  let parentConsultationId: string | null = null;
  if (isFollowUp) {
    const patientIdRaw = formData.get('patientId');
    if (typeof patientIdRaw !== 'string') {
      return { error: 'Patient manquant.' };
    }
    const parent = await getLatestPrimaryConsultationForPatient(
      session.tenantId,
      patientIdRaw,
    );
    if (!parent) {
      return {
        error:
          "Aucune consultation précédente pour ce patient — un suivi ne peut être rattaché qu'à une consultation existante.",
      };
    }
    parentConsultationId = parent.id;
  }

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
