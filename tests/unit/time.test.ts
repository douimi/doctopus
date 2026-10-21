import { describe, expect, it } from 'vitest';
import {
  CABINET_TZ,
  todayBoundsUtc,
  rangeBoundsUtc,
  currentMonthKey,
  elapsedDaysInMonth,
  monthBoundsUtc,
  monthPrefixBoundsUtc,
  parseMonthKey,
  previousPeriod,
  shiftMonthKey,
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

describe('month helpers', () => {
  it('parses and shifts month keys across years', () => {
    expect(parseMonthKey('2026-13')).toBeNull();
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2025-12', 1)).toBe('2026-01');
    expect(shiftMonthKey('2026-10', -12)).toBe('2025-10');
  });

  it('monthBoundsUtc starts at local midnight on the 1st', () => {
    const { startUtc, endUtc } = monthBoundsUtc('2026-03');
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: CABINET_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(fmt.format(startUtc)).toBe('2026-03-01, 00:00');
    expect(fmt.format(endUtc)).toBe('2026-04-01, 00:00');
  });

  it('monthPrefixBoundsUtc clamps to the month length', () => {
    expect(monthPrefixBoundsUtc('2026-02', 31)).toEqual(monthBoundsUtc('2026-02'));
    const p = monthPrefixBoundsUtc('2026-09', 21);
    expect(p.startUtc).toEqual(monthBoundsUtc('2026-09').startUtc);
    expect((p.endUtc.getTime() - p.startUtc.getTime()) / 86_400_000).toBeCloseTo(21, 0);
  });

  it('elapsedDaysInMonth is only set for the running month', () => {
    const now = new Date('2026-10-21T12:00:00Z');
    expect(currentMonthKey(now)).toBe('2026-10');
    expect(elapsedDaysInMonth('2026-10', now)).toBe(21);
    expect(elapsedDaysInMonth('2026-09', now)).toBeNull();
  });

  it('previousPeriod is the equal-length window just before', () => {
    const p = rangeBoundsUtc('7d', new Date('2026-05-04T12:00:00Z'));
    const prev = previousPeriod(p);
    expect(prev.endUtc).toEqual(p.startUtc);
    expect(prev.endUtc.getTime() - prev.startUtc.getTime()).toBe(p.endUtc.getTime() - p.startUtc.getTime());
  });
});
