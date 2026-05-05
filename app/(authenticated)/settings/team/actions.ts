'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { dbAdmin } from '@/db/client';
import { tenantInvites, userProfiles } from '@/db/schema';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import { requireDoctor } from '@/lib/auth/guards';
import { env } from '@/lib/env';
import { recordAudit } from '@/lib/audit/record';

const inviteSchema = z.object({ email: z.string().email() });

export type InviteAssistantState = { error: string | null; lastUrl: string | null };

export async function inviteAssistant(
  _: InviteAssistantState,
  formData: FormData,
): Promise<InviteAssistantState> {
  const session = await requireDoctor();
  const parsed = inviteSchema.safeParse({ email: formData.get('email') });
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

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'tenant.invite_created',
    entityType: 'invite',
    metadata: { email: parsed.data.email },
  });

  const url = `${env().APP_URL}/invite/${token}`;
  revalidatePath('/settings/team');
  return { error: null, lastUrl: url };
}

const inviteIdSchema = z.object({ inviteId: z.string().uuid() });

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsed = inviteIdSchema.safeParse({ inviteId: formData.get('inviteId') });
  if (!parsed.success) return;

  const result = await dbAdmin()
    .update(tenantInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(tenantInvites.id, parsed.data.inviteId),
        eq(tenantInvites.tenantId, session.tenantId),
        eq(tenantInvites.kind, 'assistant'),
      ),
    )
    .returning({ id: tenantInvites.id, emailHint: tenantInvites.emailHint });
  if (result.length === 0) return;

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'tenant.invite_revoked',
    entityType: 'invite',
    entityId: parsed.data.inviteId,
    metadata: { email: result[0].emailHint },
  });
  revalidatePath('/settings/team');
}

const memberToggleSchema = z.object({
  userId: z.string().uuid(),
  active: z.enum(['true', 'false']),
});

export async function toggleMemberActiveAction(formData: FormData): Promise<void> {
  const session = await requireDoctor();
  const parsed = memberToggleSchema.safeParse({
    userId: formData.get('userId'),
    active: formData.get('active'),
  });
  if (!parsed.success) return;

  // Doctor cannot deactivate themselves; we only allow toggling assistants.
  const [target] = await dbAdmin()
    .select({ id: userProfiles.id, role: userProfiles.role })
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.id, parsed.data.userId),
        eq(userProfiles.tenantId, session.tenantId),
      ),
    );
  if (!target || target.role !== 'assistant') return;

  const nextActive = parsed.data.active === 'true';
  await dbAdmin()
    .update(userProfiles)
    .set({ isActive: nextActive, updatedAt: new Date() })
    .where(eq(userProfiles.id, parsed.data.userId));

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: nextActive ? 'tenant.member_reactivated' : 'tenant.member_deactivated',
    entityType: 'user_profile',
    entityId: parsed.data.userId,
  });
  revalidatePath('/settings/team');
}
