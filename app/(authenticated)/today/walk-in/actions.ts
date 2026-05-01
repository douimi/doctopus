'use server';

import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { walkIn } from '@/lib/appointments/mutations';
import { walkInSchema } from '@/lib/appointments/schemas';

export type WalkInState = { error: string | null };

export async function walkInAction(_: WalkInState, formData: FormData): Promise<WalkInState> {
  const session = await requireSession();
  const parsed = walkInSchema.safeParse({
    patientId: formData.get('patientId'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) return { error: 'Patient invalide.' };
  await walkIn(session.tenantId, session.userId, parsed.data);
  redirect('/today');
}
