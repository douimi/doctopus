'use server';

import { requireDoctor } from '@/lib/auth/guards';
import { replaceQuickReplies } from '@/lib/messaging/queries';
import { quickRepliesSchema } from '@/lib/messaging/schemas';

export type SaveQuickRepliesResult = { ok: true } | { ok: false; error: string };

/** Doctor-only: replaces the cabinet's one-tap messages (order = array order). */
export async function saveQuickRepliesAction(
  items: Array<{ label: string; body: string }>,
): Promise<SaveQuickRepliesResult> {
  const session = await requireDoctor();
  const parsed = quickRepliesSchema.safeParse(items);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Liste invalide.' };
  }
  await replaceQuickReplies(session.tenantId, parsed.data);
  return { ok: true };
}
