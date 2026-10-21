'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { archivePatient } from '@/lib/patients/mutations';
import { recordAudit } from '@/lib/audit/record';

const archiveSchema = z.object({ id: z.string().uuid() });

export type ArchiveResult = { ok: true } | { ok: false; error: string };

/**
 * Archives a patient (soft delete: hidden from lists and pickers, file and
 * history kept). Called from the confirm dialog on the patient file, which
 * navigates back to /patients on success.
 */
export async function archivePatientAction(formData: FormData): Promise<ArchiveResult> {
  const session = await requireSession();
  const parsed = archiveSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Patient invalide.' };
  const found = await archivePatient(session.tenantId, parsed.data.id);
  if (!found) return { ok: false, error: 'Patient introuvable.' };
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'patient.archive',
    entityType: 'patient',
    entityId: parsed.data.id,
  });
  revalidatePath('/patients');
  revalidatePath(`/patients/${parsed.data.id}`);
  return { ok: true };
}
