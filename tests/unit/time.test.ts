import { describe, expect, it } from 'vitest';
import {
  CABINET_TZ,
  todayBoundsUtc,
  rangeBoundsUtc,
  type StatsRange,
} from '@/lib/time';

describe('CABINET_TZ', () => {
  it('is Africa/Casablanca', () => {
    expect(CABINET_TZ).toBe('Africa/Casablanca');
  });
});

describe('todayBoundsUtc', () => {
  it('returns a [start, end) UTC pair spanning ~24h', () => {
    const { startUtc, endUtc } = todayBoundsUtc(new Date('2026-05-04T15:00:00Z'));
    const diffHours = (endUtc.getTime() - startUtc.getTime()) / 3_600_000;
    expect(diffHours).toBeGreaterThanOrEqual(23);
    expect(diffHours).toBeLessThanOrEqual(25);
    expect(endUtc.getTime()).toBeGreaterThan(startUtc.getTime());
  });

  it('start is at 00:00 Casablanca local for the given moment', () => {
    const { startUtc } = todayBoundsUtc(new Date('2026-05-04T15:00:00Z'));
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: CABINET_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = fmt.format(startUtc);
    expect(formatted).toMatch(/^00:00$/);
  });
});

describe('rangeBoundsUtc', () => {
  const ranges: StatsRange[] = ['today', '7d', '30d', '90d'];

  it.each(ranges)('returns a coherent [start, end) for %s', (range) => {
    const now = new Date('2026-05-04T12:00:00Z');
    const { startUtc, endUtc } = rangeBoundsUtc(range, now);
    expect(endUtc.getTime()).toBeGreaterThan(startUtc.getTime());
    expect(endUtc.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('today range spans ~24h', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('today', new Date('2026-05-04T12:00:00Z'));
    const diffHours = (endUtc.getTime() - startUtc.getTime()) / 3_600_000;
    expect(diffHours).toBeGreaterThanOrEqual(23);
    expect(diffHours).toBeLessThanOrEqual(25);
  });

  it('7d range spans ~7 days', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('7d', new Date('2026-05-04T12:00:00Z'));
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThanOrEqual(7.1);
  });

  it('30d range spans ~30 days', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('30d', new Date('2026-05-04T12:00:00Z'));
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });

  it('90d range spans ~90 days', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('90d', new Date('2026-05-04T12:00:00Z'));
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(89.9);
    expect(diffDays).toBeLessThanOrEqual(90.1);
  });
});
