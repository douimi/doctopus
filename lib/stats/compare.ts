/**
 * Relative change between two values, as a ratio. Returns null when the
 * baseline is zero and the current value isn't (no meaningful %), and 0
 * when both are zero.
 */
export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}
