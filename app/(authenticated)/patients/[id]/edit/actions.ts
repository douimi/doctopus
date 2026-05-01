'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { patientUpdateSchema } from '@/lib/patients/schemas';
import { updatePatient } from '@/lib/patients/mutations';

export type UpdatePatientState = { error: string | null };

export async function updatePatientAction(
  _: UpdatePatientState,
  formData: FormData,
): Promise<UpdatePatientState> {
  const session = await requireSession();
  const parsed = patientUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: `${first.path.join('.')}: ${first.message}` };
  }
  const updated = await updatePatient(session.tenantId, parsed.data);
  if (!updated) return { error: 'Patient introuvable.' };
  revalidatePath(`/patients/${updated.id}`);
  redirect(`/patients/${updated.id}`);
}
