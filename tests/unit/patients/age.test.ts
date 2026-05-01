import { describe, expect, it } from 'vitest';
import { ageFromDob } from '@/lib/patients/age';

describe('ageFromDob', () => {
  it('returns full years when birthday already passed this year', () => {
    expect(ageFromDob('2000-01-01', new Date('2026-05-01T00:00:00Z'))).toBe(26);
  });

  it('returns full years - 1 when birthday is later this year', () => {
    expect(ageFromDob('2000-12-31', new Date('2026-05-01T00:00:00Z'))).toBe(25);
  });

  it('handles same-day birthday', () => {
    expect(ageFromDob('2000-05-01', new Date('2026-05-01T00:00:00Z'))).toBe(26);
  });

  it('handles infants (months not years)', () => {
    expect(ageFromDob('2026-04-01', new Date('2026-05-01T00:00:00Z'))).toBe(0);
  });
});
