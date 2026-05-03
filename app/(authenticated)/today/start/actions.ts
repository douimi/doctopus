'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireDoctor } from '@/lib/auth/guards';
import { startFromAppointment } from '@/lib/consultations/mutations';
import { recordAudit } from '@/lib/audit/record';

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
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.start',
    entityType: 'consultation',
    entityId: consultation.id,
    metadata: { appointmentId: parsed.data.appointmentId },
  });
  redirect(`/consultations/${consultation.id}`);
}
