'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { labelSchema, removeLabelSchema } from '@/lib/patients/schemas';
import { addAllergy, removeAllergy } from '@/lib/patients/mutations';
import { firstIssueFr } from '@/lib/zod-fr';
import { frenchIssue } from '../../form-errors';

export type LabelActionResult = { ok: true } | { ok: false; error: string };

function revalidate(patientId: string) {
  revalidatePath(`/patients/${patientId}`);
  // The consultation cockpit shows the same chips.
  revalidatePath('/consultations/[id]', 'page');
}

// Clinical data: doctor only (the assistant's patient file is read-only here).
export async function addAllergyAction(formData: FormData): Promise<LabelActionResult> {
  const session = await requireSession();
  if (session.role !== 'doctor') {
    return { ok: false, error: 'Seul le médecin peut modifier les données cliniques.' };
  }
  const parsed = labelSchema.safeParse(
    { patientId: formData.get('patientId'), label: formData.get('label') },
    { error: frenchIssue },
  );
  if (!parsed.success) {
    return { ok: false, error: firstIssueFr(parsed.error, { label: 'Allergie', patientId: 'Patient' }) };
  }
  await addAllergy(session.tenantId, parsed.data.patientId, parsed.data.label);
  revalidate(parsed.data.patientId);
  return { ok: true };
}

export async function removeAllergyAction(formData: FormData): Promise<LabelActionResult> {
  const session = await requireSession();
  if (session.role !== 'doctor') {
    return { ok: false, error: 'Seul le médecin peut modifier les données cliniques.' };
  }
  const parsed = removeLabelSchema.safeParse({ id: formData.get('id') });
  const patientId = formData.get('patientId');
  if (!parsed.success || typeof patientId !== 'string') {
    return { ok: false, error: 'Élément introuvable.' };
  }
  await removeAllergy(session.tenantId, parsed.data.id);
  revalidate(patientId);
  return { ok: true };
}
