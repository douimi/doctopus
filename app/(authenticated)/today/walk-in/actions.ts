'use server';

import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { walkIn } from '@/lib/appointments/mutations';
import { walkInSchema } from '@/lib/appointments/schemas';

/**
 * One-click "Mettre en salle d'attente" — fired from a per-row Button on
 * /today/walk-in. No motif: the doctor can edit it later from the
 * consultation. Redirects back to /today on success.
 */
export async function walkInDirectAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = walkInSchema.safeParse({
    patientId: formData.get('patientId'),
  });
  if (!parsed.success) return;
  await walkIn(session.tenantId, session.userId, parsed.data);
  redirect('/today');
}
