import { describe, expect, it } from 'vitest';
import { computeCostMicrousd } from '@/lib/chatbot/cost';

describe('computeCostMicrousd', () => {
  it('claude-haiku 1k in / 200 out = 0.0008 + 0.0008 = $0.0016 = 1600 microUSD', () => {
    // 1000 / 1_000_000 * 0.8 = 0.0008 USD input
    // 200 / 1_000_000 * 4.0 = 0.0008 USD output
    expect(computeCostMicrousd('claude-haiku-4-5-20251001', 1000, 200)).toBe(1600);
  });

  it('returns null for unknown model', () => {
    expect(computeCostMicrousd('not-a-real-model', 1000, 1000)).toBeNull();
  });

  it('zero tokens = zero cost', () => {
    expect(computeCostMicrousd('claude-haiku-4-5-20251001', 0, 0)).toBe(0);
  });
});
