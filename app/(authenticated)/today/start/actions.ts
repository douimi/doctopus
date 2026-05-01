'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireDoctor } from '@/lib/auth/guards';
import { startFromAppointment } from '@/lib/consultations/mutations';

const schema = z.object({ appointmentId: z.string().uuid() });

export async function startConsultationAction(formData: FormData) {
  const session = await requireDoctor();
  const parsed = schema.safeParse({ appointmentId: formData.get('appointmentId') });
  if (!parsed.success) return;
  const consultation = await startFromAppointment(
    session.tenantId,
    parsed.data.appointmentId,
    session.userId,
  );
  redirect(`/consultations/${consultation.id}`);
}
