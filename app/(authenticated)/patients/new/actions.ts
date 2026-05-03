'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { patientCreateSchema } from '@/lib/patients/schemas';
import { createPatient } from '@/lib/patients/mutations';
import { recordAudit } from '@/lib/audit/record';

const withNext = patientCreateSchema.extend({ next: z.string().optional() });

export type CreatePatientState = { error: string | null };

export async function createPatientAction(
  _: CreatePatientState,
  formData: FormData,
): Promise<CreatePatientState> {
  const session = await requireSession();
  const parsed = withNext.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: `${first.path.join('.')}: ${first.message}` };
  }
  const patient = await createPatient(session.tenantId, parsed.data);
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'patient.create',
    entityType: 'patient',
    entityId: patient.id,
  });
  const next = parsed.data.next;
  if (next && /^\/[^\s]*$/.test(next)) {
    redirect(`${next}${next.includes('?') ? '&' : '?'}q=${encodeURIComponent(patient.lastName)}`);
  }
  redirect(`/patients/${patient.id}`);
}
