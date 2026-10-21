'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { patientUpdateSchema } from '@/lib/patients/schemas';
import { updatePatient } from '@/lib/patients/mutations';
import { recordAudit } from '@/lib/audit/record';
import { fieldErrorsFr, formValues, frenchIssue, summaryFr } from '../../form-errors';
import type { PatientFormState } from '../../patient-form';

export async function updatePatientAction(
  _: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const session = await requireSession();
  const parsed = patientUpdateSchema.safeParse(Object.fromEntries(formData.entries()), {
    error: frenchIssue,
  });
  if (!parsed.success) {
    return {
      error: summaryFr(parsed.error),
      fieldErrors: fieldErrorsFr(parsed.error),
      values: formValues(formData),
    };
  }
  const updated = await updatePatient(session.tenantId, parsed.data);
  if (!updated) return { error: 'Patient introuvable.', values: formValues(formData) };
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'patient.update',
    entityType: 'patient',
    entityId: updated.id,
  });
  revalidatePath(`/patients/${updated.id}`);
  redirect(`/patients/${updated.id}?saved=1`);
}
