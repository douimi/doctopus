'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { patientHistorySchema, type PatientHistoryInput } from '@/lib/patients/schemas';
import { updatePatientHistory } from '@/lib/patients/mutations';
import { recordAudit } from '@/lib/audit/record';
import { firstIssueFr, PATIENT_HISTORY_LABELS } from '@/lib/zod-fr';

export type SaveHistoryResult = { ok: boolean; error?: string };

export async function savePatientHistoryAction(
  data: PatientHistoryInput,
): Promise<SaveHistoryResult> {
  const session = await requireSession();
  if (session.role !== 'doctor') {
    return { ok: false, error: 'Seul le médecin peut modifier les antécédents.' };
  }
  const parsed = patientHistorySchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: firstIssueFr(parsed.error, PATIENT_HISTORY_LABELS) };
  }
  const row = await updatePatientHistory(session.tenantId, parsed.data);
  if (!row) return { ok: false, error: 'Patient introuvable.' };
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'patient.history_update',
    entityType: 'patient',
    entityId: parsed.data.patientId,
  });
  revalidatePath(`/patients/${parsed.data.patientId}`);
  // The antécédents panel is also edited from the consultation cockpit.
  revalidatePath('/consultations/[id]', 'page');
  return { ok: true };
}
