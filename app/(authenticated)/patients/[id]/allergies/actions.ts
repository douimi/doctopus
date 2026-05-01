'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { labelSchema, removeLabelSchema } from '@/lib/patients/schemas';
import { addAllergy, removeAllergy } from '@/lib/patients/mutations';

export async function addAllergyAction(formData: FormData) {
  const session = await requireSession();
  const parsed = labelSchema.safeParse({
    patientId: formData.get('patientId'),
    label: formData.get('label'),
  });
  if (!parsed.success) return;
  await addAllergy(session.tenantId, parsed.data.patientId, parsed.data.label);
  revalidatePath(`/patients/${parsed.data.patientId}`);
}

export async function removeAllergyAction(formData: FormData) {
  const session = await requireSession();
  const parsed = removeLabelSchema.safeParse({ id: formData.get('id') });
  const patientId = formData.get('patientId');
  if (!parsed.success || typeof patientId !== 'string') return;
  await removeAllergy(session.tenantId, parsed.data.id);
  revalidatePath(`/patients/${patientId}`);
}
