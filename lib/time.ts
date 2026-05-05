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
