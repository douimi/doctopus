import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function verifyInviteToken(token: string, hash: string): boolean {
  const expected = Buffer.from(hashInviteToken(token), 'hex');
  const actual = Buffer.from(hash, 'hex');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
