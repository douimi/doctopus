'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { cancelAppointment, markArrived, markNoShow } from '@/lib/appointments/mutations';

const idSchema = z.object({ id: z.string().uuid() });

export async function markArrivedAction(formData: FormData) {
  const session = await requireSession();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return;
  await markArrived(session.tenantId, parsed.data.id);
  revalidatePath('/today');
}

export async function cancelAppointmentAction(formData: FormData) {
  const session = await requireSession();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return;
  await cancelAppointment(session.tenantId, parsed.data.id);
  revalidatePath('/today');
}

export async function markNoShowAction(formData: FormData) {
  const session = await requireSession();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return;
  await markNoShow(session.tenantId, parsed.data.id);
  revalidatePath('/today');
}
