export const CABINET_TZ = 'Africa/Casablanca';

export type StatsRange = 'today' | '7d' | '30d' | '90d';

/**
 * Returns the [start, end) UTC instants of "today" in CABINET_TZ for the given moment.
 * "Today" = the current Casablanca calendar day. End is the start of tomorrow.
 */
export function todayBoundsUtc(now: Date = new Date()): { startUtc: Date; endUtc: Date } {
  const partsFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CABINET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = partsFmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value);
  const d = Number(parts.find((p) => p.type === 'day')!.value);

  const startUtc = casablancaLocalToUtc(y, m, d, 0, 0);
  const endUtc = new Date(startUtc.getTime() + 24 * 3_600_000);
  return { startUtc, endUtc };
}

/**
 * Returns the [start, end) UTC instants for a stats range, anchored at "now" in CABINET_TZ.
 * - 'today': start = today 00:00 local, end = tomorrow 00:00 local (≈24h).
 * - '7d': end = tomorrow 00:00 local; start = end − 7 days.
 * - '30d': end = tomorrow 00:00 local; start = end − 30 days.
 * - '90d': end = tomorrow 00:00 local; start = end − 90 days.
 */
export function rangeBoundsUtc(range: StatsRange, now: Date = new Date()): { startUtc: Date; endUtc: Date } {
  const today = todayBoundsUtc(now);
  if (range === 'today') return today;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return {
    startUtc: new Date(today.endUtc.getTime() - days * 86_400_000),
    endUtc: today.endUtc,
  };
}

export type StatsPeriod = { startUtc: Date; endUtc: Date };

/** 'YYYY-MM' calendar month in CABINET_TZ. */
export type MonthKey = string;

const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseMonthKey(key: string | undefined | null): { y: number; m: number } | null {
  const match = key ? MONTH_KEY_RE.exec(key) : null;
  return match ? { y: Number(match[1]), m: Number(match[2]) } : null;
}

function toMonthKey(y: number, m: number): MonthKey {
  return `${y}-${String(m).padStart(2, '0')}`;
}

function casablancaYmd(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CABINET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  const { y, m } = casablancaYmd(now);
  return toMonthKey(y, m);
}

export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const { y, m } = parseMonthKey(key)!;
  const idx = y * 12 + (m - 1) + delta;
  return toMonthKey(Math.floor(idx / 12), (idx % 12) + 1);
}

export function daysInMonth(key: MonthKey): number {
  const { y, m } = parseMonthKey(key)!;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** [1st 00:00 local, 1st of next month 00:00 local) as UTC instants. */
export function monthBoundsUtc(key: MonthKey): StatsPeriod {
  const { y, m } = parseMonthKey(key)!;
  const next = parseMonthKey(shiftMonthKey(key, 1))!;
  return {
    startUtc: casablancaLocalToUtc(y, m, 1, 0, 0),
    endUtc: casablancaLocalToUtc(next.y, next.m, 1, 0, 0),
  };
}

/**
 * Bounds of `key` limited to its first `days` days (clamped to the
 * month's length). Used for like-for-like comparisons while the current
 * month is still running: Oct 1–21 is compared to Sep 1–21, not to all
 * of September.
 */
export function monthPrefixBoundsUtc(key: MonthKey, days: number): StatsPeriod {
  const full = monthBoundsUtc(key);
  if (days >= daysInMonth(key)) return full;
  const { y, m } = parseMonthKey(key)!;
  return { startUtc: full.startUtc, endUtc: casablancaLocalToUtc(y, m, days + 1, 0, 0) };
}

/** Day-of-month reached so far if `key` is the running month, else null. */
export function elapsedDaysInMonth(key: MonthKey, now: Date = new Date()): number | null {
  if (key !== currentMonthKey(now)) return null;
  return casablancaYmd(now).d;
}

/** The window of equal length immediately before `p`. */
export function previousPeriod(p: StatsPeriod): StatsPeriod {
  const len = p.endUtc.getTime() - p.startUtc.getTime();
  return { startUtc: new Date(p.startUtc.getTime() - len), endUtc: p.startUtc };
}

export function formatMonthKeyFr(key: MonthKey, opts: { short?: boolean } = {}): string {
  const { y, m } = parseMonthKey(key)!;
  return new Intl.DateTimeFormat('fr-FR', {
    month: opts.short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 15)));
}

/**
 * Convert a Casablanca-local wall-clock (Y-M-D h:m) into the corresponding UTC instant.
 * Uses Intl to find Casablanca's offset and back-solves.
 */
function casablancaLocalToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CABINET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(guess);
  const localY = Number(parts.find((p) => p.type === 'year')!.value);
  const localM = Number(parts.find((p) => p.type === 'month')!.value);
  const localD = Number(parts.find((p) => p.type === 'day')!.value);
  const localH = Number(parts.find((p) => p.type === 'hour')!.value);
  const localMin = Number(parts.find((p) => p.type === 'minute')!.value);
  const localAsUtc = Date.UTC(localY, localM - 1, localD, localH, localMin);
  const offsetMs = guess.getTime() - localAsUtc;
  return new Date(guess.getTime() + offsetMs);
}
