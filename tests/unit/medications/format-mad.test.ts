import { describe, expect, it } from 'vitest';
import { formatMad } from '@/lib/medications/format';

describe('formatMad', () => {
  it('returns "—" for null', () => {
    expect(formatMad(null)).toBe('—');
  });

  it('returns "—" for an unparseable string', () => {
    expect(formatMad('not-a-number')).toBe('—');
  });

  it('returns "—" for an empty string', () => {
    expect(formatMad('')).toBe('—');
  });

  it('formats a simple decimal as fr-FR with two decimals and " MAD" suffix', () => {
    const expected = `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(12.5)} MAD`;
    expect(formatMad('12.5')).toBe(expected);
  });

  it('formats thousands using fr-FR separators (Intl-stable across Node versions)', () => {
    const expected = `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1234.5)} MAD`;
    expect(formatMad('1234.5')).toBe(expected);
  });

  it('rounds to two decimals (half-to-even per Intl default)', () => {
    const expected = `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(8.205)} MAD`;
    expect(formatMad('8.205')).toBe(expected);
  });
});
