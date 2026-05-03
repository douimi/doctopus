import { PRICING_USD_PER_MTOKEN } from './pricing';

/**
 * Compute estimated cost in microUSD (1 USD = 1_000_000 microUSD).
 * Returns null when the model is unknown so we record null rather than 0.
 */
export function computeCostMicrousd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const price = PRICING_USD_PER_MTOKEN[model];
  if (!price) return null;
  const inputUsd = (inputTokens / 1_000_000) * price.input;
  const outputUsd = (outputTokens / 1_000_000) * price.output;
  return Math.round((inputUsd + outputUsd) * 1_000_000);
}
