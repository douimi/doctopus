import { dbAdmin } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import { env } from '@/lib/env';

export type OwnerInviteResult = {
  url: string;
  tokenHash: string;
  expiresAt: Date;
};

export async function createOwnerInvite(
  email: string,
  expiresInDays: number,
  createdBy: string | null,
): Promise<OwnerInviteResult> {
  if (!Number.isInteger(expiresInDays) || expiresInDays <= 0) {
    throw new Error('expiresInDays must be a positive integer');
  }
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000);
  await dbAdmin().insert(tenantInvites).values({
    tokenHash,
    kind: 'tenant_owner',
    emailHint: email,
    expiresAt,
    createdBy: createdBy ?? null,
  });
  return { url: `${env().APP_URL}/invite/${token}`, tokenHash, expiresAt };
}
