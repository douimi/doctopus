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
  email: z.string().trim().email('adresse email invalide.'),
  days: z.coerce
    .number({ error: 'doit être un nombre.' })
    .int('doit être un nombre entier de jours.')
    .min(1, 'au moins 1 jour.')
    .max(30, '30 jours maximum.')
    .default(7),
});

export type CreateInviteState = {
  error: string | null;
  url: string | null;
  expiresAt: string | null;
  fieldErrors?: { email?: string; days?: string };
  /** Echoed back on error so the inputs keep their values. */
  values?: { email: string; days: string };
  /** Email the last successful invite was created for. */
  email?: string;
};

export type RevokeInviteResult = { ok: true } | { ok: false; error: string };

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
    const fieldErrors: NonNullable<CreateInviteState['fieldErrors']> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'email' || key === 'days') && !fieldErrors[key]) {
        fieldErrors[key] = issue.message.charAt(0).toUpperCase() + issue.message.slice(1);
      }
    }
    return {
      error: null,
      url: null,
      expiresAt: null,
      fieldErrors,
      values: {
        email: String(formData.get('email') ?? ''),
        days: String(formData.get('days') ?? '7'),
      },
    };
  }

  const result = await createOwnerInvite(parsed.data.email, parsed.data.days, session.userId);

  // No tenant_id at creation time — we log to console/Sentry rather than audit_log.
  console.warn(`[admin] invite created for ${parsed.data.email} by ${session.email}`);

  revalidatePath('/admin/invites');
  return {
    error: null,
    url: result.url,
    expiresAt: result.expiresAt.toISOString(),
    email: parsed.data.email,
  };
}

const revokeSchema = z.object({ inviteId: z.string().uuid() });

export async function adminRevokeInviteAction(formData: FormData): Promise<RevokeInviteResult> {
  const session = await requireAdmin();
  const parsed = revokeSchema.safeParse({ inviteId: formData.get('inviteId') });
  if (!parsed.success) return { ok: false, error: 'Requête invalide. Rechargez la page.' };

  // We need the tenant_id (if any) to write the audit row; fetch first.
  const [inv] = await dbAdmin()
    .select()
    .from(tenantInvites)
    .where(eq(tenantInvites.id, parsed.data.inviteId));
  if (!inv) return { ok: false, error: 'Invitation introuvable.' };
  if (inv.revokedAt) return { ok: true }; // idempotent
  if (inv.consumedAt) {
    return { ok: false, error: 'Cette invitation a déjà été acceptée : elle ne peut plus être révoquée.' };
  }

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
  return { ok: true };
}
