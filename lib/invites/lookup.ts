import 'server-only';
import { eq } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { hashInviteToken } from './tokens';

export type InviteLookupResult =
  | { ok: true; invite: typeof tenantInvites.$inferSelect }
  | { ok: false; reason: 'not_found' | 'expired' | 'consumed' };

export async function lookupInvite(rawToken: string): Promise<InviteLookupResult> {
  if (!/^[0-9a-f]{64}$/.test(rawToken)) return { ok: false, reason: 'not_found' };
  const hash = hashInviteToken(rawToken);
  const row = await dbAdmin().query.tenantInvites.findFirst({
    where: eq(tenantInvites.tokenHash, hash),
  });
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.consumedAt) return { ok: false, reason: 'consumed' };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, invite: row };
}
