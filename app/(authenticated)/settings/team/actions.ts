'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { dbAdmin } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import { requireDoctor } from '@/lib/auth/guards';
import { env } from '@/lib/env';

const schema = z.object({ email: z.string().email() });

export type InviteAssistantState = { error: string | null; lastUrl: string | null };

export async function inviteAssistant(
  _: InviteAssistantState,
  formData: FormData,
): Promise<InviteAssistantState> {
  const session = await requireDoctor();
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Email invalide.', lastUrl: null };

  const token = generateInviteToken();
  const hash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await dbAdmin().insert(tenantInvites).values({
    tokenHash: hash,
    kind: 'assistant',
    tenantId: session.tenantId,
    emailHint: parsed.data.email,
    expiresAt,
    createdBy: session.userId,
  });

  const url = `${env().APP_URL}/invite/${token}`;
  revalidatePath('/settings/team');
  return { error: null, lastUrl: url };
}
