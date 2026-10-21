'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { patientCreateSchema } from '@/lib/patients/schemas';
import { createPatient } from '@/lib/patients/mutations';
import { recordAudit } from '@/lib/audit/record';
import { fieldErrorsFr, formValues, frenchIssue, summaryFr } from '../form-errors';
import type { PatientFormState } from '../patient-form';

const withNext = patientCreateSchema.extend({ next: z.string().optional() });

export async function createPatientAction(
  _: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const session = await requireSession();
  const parsed = withNext.safeParse(Object.fromEntries(formData.entries()), {
    error: frenchIssue,
  });
  if (!parsed.success) {
    return {
      error: summaryFr(parsed.error),
      fieldErrors: fieldErrorsFr(parsed.error),
      values: formValues(formData),
    };
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
  if (next && /^\/[^\s/][^\s]*$/.test(next)) {
    // `patient` preselects the new file in the RDV / walk-in flows; `q`
    // keeps older pickers (consultations/new…) filtered on it.
    const sep = next.includes('?') ? '&' : '?';
    redirect(
      `${next}${sep}patient=${patient.id}&q=${encodeURIComponent(patient.lastName)}`,
    );
  }
  redirect(`/patients/${patient.id}?created=1`);
}
