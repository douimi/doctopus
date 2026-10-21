import 'server-only';
import { z } from 'zod';
import { getPatientById } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import type { FlowPatient } from '@/components/today/selected-patient';

/** Resolves `?patient=<id>` for the RDV / walk-in flows (archived → null). */
export async function resolveFlowPatient(
  tenantId: string,
  id: string | undefined,
): Promise<FlowPatient | null> {
  if (!id || !z.string().uuid().safeParse(id).success) return null;
  const p = await getPatientById(tenantId, id);
  if (!p || p.isArchived) return null;
  return {
    id: p.id,
    fullName: `${p.lastName} ${p.firstName}`,
    ageLabel: formatAge(p.dateOfBirth),
    phone: p.phone,
  };
}
