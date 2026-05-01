import { describe, expect, it } from 'vitest';
import { generateInviteToken, hashInviteToken, verifyInviteToken } from '@/lib/invites/tokens';

describe('invite tokens', () => {
  it('generates a 32-byte hex string', () => {
    const t = generateInviteToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash and verify roundtrip', () => {
    const t = generateInviteToken();
    const h = hashInviteToken(t);
    expect(h).not.toBe(t);
    expect(verifyInviteToken(t, h)).toBe(true);
  });

  it('verify rejects mismatch', () => {
    const t = generateInviteToken();
    const h = hashInviteToken(t);
    expect(verifyInviteToken('00'.repeat(32), h)).toBe(false);
  });
});
