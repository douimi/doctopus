import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MODELS_BY_PROVIDER,
  PRICING_USD_PER_MTOKEN,
} from '@/lib/chatbot/pricing';

describe('pricing', () => {
  it('every allowed model has a price entry', () => {
    for (const provider of Object.keys(ALLOWED_MODELS_BY_PROVIDER) as Array<
      'anthropic' | 'openai' | 'mistral'
    >) {
      for (const model of ALLOWED_MODELS_BY_PROVIDER[provider]) {
        expect(PRICING_USD_PER_MTOKEN[model], `missing price for ${model}`).toBeDefined();
      }
    }
  });
});
