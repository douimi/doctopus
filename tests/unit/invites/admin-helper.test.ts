import { afterAll, describe, expect, it } from 'vitest';
import { __closeDbForTests, dbAdmin } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createOwnerInvite } from '@/lib/invites/admin';
import { hashInviteToken } from '@/lib/invites/tokens';

describe('createOwnerInvite', () => {
  afterAll(async () => {
    await __closeDbForTests();
  });

  it('persists an invite and returns a working URL', async () => {
    const result = await createOwnerInvite('test@example.com', 7, null);
    expect(result.url).toMatch(/\/invite\/[0-9a-f]{64}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Extract token from URL, verify it hashes to the stored hash.
    const token = result.url.split('/invite/')[1];
    expect(hashInviteToken(token)).toBe(result.tokenHash);

    // Confirm the row is in the DB.
    const [row] = await dbAdmin()
      .select()
      .from(tenantInvites)
      .where(eq(tenantInvites.tokenHash, result.tokenHash));
    expect(row.kind).toBe('tenant_owner');
    expect(row.emailHint).toBe('test@example.com');
  });

  it('rejects non-positive expiresInDays', async () => {
    await expect(createOwnerInvite('a@b.com', 0, null)).rejects.toThrow();
    await expect(createOwnerInvite('a@b.com', -1, null)).rejects.toThrow();
  });
});
