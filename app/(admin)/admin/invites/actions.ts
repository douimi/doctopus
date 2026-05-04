'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { dbAdmin } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/audit/record';
import { createOwnerInvite } from '@/lib/invites/admin';

const createSchema = z.object({
  email: z.string().email(),
  days: z.coerce.number().int().positive().max(30).default(7),
});

export type CreateInviteState = {
  error: string | null;
  url: string | null;
  expiresAt: string | null;
};

export async function adminCreateInviteAction(
  _: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    email: formData.get('email'),
    days: formData.get('days') || 7,
  });
  if (!parsed.success) {
    return { error: 'Email invalide.', url: null, expiresAt: null };
  }

  const result = await createOwnerInvite(parsed.data.email, parsed.data.days, session.userId);

  // No tenant_id at creation time — we log to console/Sentry rather than audit_log.
  console.warn(`[admin] invite created for ${parsed.data.email} by ${session.email}`);

  revalidatePath('/admin/invites');
  return { error: null, url: result.url, expiresAt: result.expiresAt.toISOString() };
}

const revokeSchema = z.object({ inviteId: z.string().uuid() });

export async function adminRevokeInviteAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = revokeSchema.safeParse({ inviteId: formData.get('inviteId') });
  if (!parsed.success) return;

  // We need the tenant_id (if any) to write the audit row; fetch first.
  const [inv] = await dbAdmin()
    .select()
    .from(tenantInvites)
    .where(eq(tenantInvites.id, parsed.data.inviteId));
  if (!inv) return;
  if (inv.consumedAt || inv.revokedAt) return; // idempotent

  await dbAdmin()
    .update(tenantInvites)
    .set({ revokedAt: new Date() })
    .where(eq(tenantInvites.id, parsed.data.inviteId));

  if (inv.tenantId) {
    await recordAudit({
      tenantId: inv.tenantId,
      actorUserId: session.userId,
      action: 'admin.invite.revoke',
      entityType: 'invite',
      entityId: parsed.data.inviteId,
      metadata: { kind: inv.kind, emailHint: inv.emailHint ?? null },
    });
  } else {
    console.warn(`[admin] invite ${parsed.data.inviteId} revoked by ${session.email} (no tenant — audit skipped)`);
  }

  revalidatePath('/admin/invites');
}
