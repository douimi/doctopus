'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { cancelAppointment, markArrived, markNoShow } from '@/lib/appointments/mutations';

const idSchema = z.object({ id: z.string().uuid() });

export type RowActionResult = { ok: true } | { ok: false; error: string };

type Transition = typeof markArrived;

/**
 * Shared body for the /today row actions. Returns a French error instead
 * of throwing so the board can show it (the old void actions swallowed
 * failures, and an invalid transition crashed into the error page).
 */
async function runTransition(
  formData: FormData,
  transition: Transition,
): Promise<RowActionResult> {
  const session = await requireSession();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Rendez-vous invalide.' };
  try {
    const updated = await transition(session.tenantId, parsed.data.id);
    if (!updated) return { ok: false, error: 'Rendez-vous introuvable.' };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Cannot ')) {
      // State machine refused: someone else already moved this row
      // (arrived, cancelled, started) from another screen.
      revalidatePath('/today');
      return {
        ok: false,
        error: 'Ce rendez-vous a déjà changé de statut. La liste a été actualisée.',
      };
    }
    throw err;
  }
  revalidatePath('/today');
  return { ok: true };
}

export async function markArrivedAction(formData: FormData): Promise<RowActionResult> {
  return runTransition(formData, markArrived);
}

export async function cancelAppointmentAction(formData: FormData): Promise<RowActionResult> {
  return runTransition(formData, cancelAppointment);
}

export async function markNoShowAction(formData: FormData): Promise<RowActionResult> {
  return runTransition(formData, markNoShow);
}
