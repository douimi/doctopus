import { describe, expect, it } from 'vitest';
import { changeRatio } from '@/lib/stats/compare';

describe('changeRatio', () => {
  it('computes the relative change', () => {
    expect(changeRatio(120, 100)).toBeCloseTo(0.2);
    expect(changeRatio(50, 100)).toBeCloseTo(-0.5);
  });
  it('is 0 when both are zero and null when only the baseline is', () => {
    expect(changeRatio(0, 0)).toBe(0);
    expect(changeRatio(10, 0)).toBeNull();
  });
});
