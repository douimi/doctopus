'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { archivePatient } from '@/lib/patients/mutations';

const archiveSchema = z.object({ id: z.string().uuid() });

export async function archivePatientAction(formData: FormData) {
  const session = await requireSession();
  const parsed = archiveSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return;
  await archivePatient(session.tenantId, parsed.data.id);
  revalidatePath('/patients');
  redirect('/patients');
}
