import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { dbAdmin, __closeDbForTests } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';

export async function mintOwnerInvite(email: string): Promise<string> {
  const token = generateInviteToken();
  await dbAdmin().insert(tenantInvites).values({
    tokenHash: hashInviteToken(token),
    kind: 'tenant_owner',
    emailHint: email,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  return token;
}

export async function closeDb() {
  await __closeDbForTests();
}
