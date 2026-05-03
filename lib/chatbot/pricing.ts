export const PRICING_USD_PER_MTOKEN: Record<
  string,
  { input: number; output: number }
> = {
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'mistral-small-latest': { input: 0.2, output: 0.6 },
  'mistral-large-latest': { input: 2.0, output: 6.0 },
};

export const ALLOWED_MODELS_BY_PROVIDER: Record<
  'anthropic' | 'openai' | 'mistral',
  string[]
> = {
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  mistral: ['mistral-small-latest', 'mistral-large-latest'],
};

export const MAD_PER_CREDIT = 5;

// Per-consultation hard caps — protects against runaway cost.
export const MAX_TURNS_PER_CONSULTATION = 30;
export const MAX_TOKENS_PER_CONSULTATION = 50_000;
export const PER_TURN_TIMEOUT_MS = 60_000;
export const MAX_OUTPUT_TOKENS_PER_TURN = 1_500;
export const MAX_INPUT_TOKEN_BUDGET = 8_000;
