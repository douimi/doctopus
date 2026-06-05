'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireDoctor } from '@/lib/auth/guards';
import { createManualConsultation } from '@/lib/consultations/mutations';
import { recordAudit } from '@/lib/audit/record';

const createSchema = z.object({
  patientId: z.string().uuid(),
  // Local-date string (YYYY-MM-DD) from a <input type="date">; interpreted
  // as midnight local time so backdated visits land on the chosen day
  // regardless of the operator's timezone.
  consultedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue : YYYY-MM-DD'),
});

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 9, 0, 0);
}

export type CreateManualConsultationState = { error: string | null };

export async function createManualConsultationAction(
  _prev: CreateManualConsultationState,
  formData: FormData,
): Promise<CreateManualConsultationState> {
  const session = await requireDoctor();
  const parsed = createSchema.safeParse({
    patientId: formData.get('patientId'),
    consultedAt: formData.get('consultedAt'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const consultation = await createManualConsultation(session.tenantId, {
    patientId: parsed.data.patientId,
    doctorId: session.userId,
    consultedAt: parseLocalDate(parsed.data.consultedAt),
  });

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.manual_create',
    entityType: 'consultation',
    entityId: consultation.id,
    metadata: { consultedAt: parsed.data.consultedAt },
  });

  redirect(`/consultations/${consultation.id}`);
}
