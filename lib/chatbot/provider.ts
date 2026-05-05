import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { env } from '@/lib/env';
import { ALLOWED_MODELS_BY_PROVIDER } from './pricing';

export type Provider = 'anthropic' | 'openai' | 'mistral';

export class ProviderNotConfiguredError extends Error {
  constructor(provider: Provider) {
    super(`Provider ${provider} has no API key (no per-tenant key + no env fallback)`);
  }
}

export class ModelNotAllowedError extends Error {
  constructor(provider: Provider, model: string) {
    super(`Model ${model} not in allowlist for provider ${provider}`);
  }
}

/**
 * Resolves the API key to use for `provider`:
 * 1. The explicit `byoApiKey` if provided (per-tenant key from
 *    lib/chatbot/byo-key.ts).
 * 2. The platform-wide env var fallback.
 *
 * Returns null if neither is available — caller should throw
 * ProviderNotConfiguredError.
 */
function resolveApiKey(provider: Provider, byoApiKey?: string | null): string | null {
  if (byoApiKey && byoApiKey.length > 0) return byoApiKey;
  switch (provider) {
    case 'anthropic':
      return env().ANTHROPIC_API_KEY ?? null;
    case 'openai':
      return env().OPENAI_API_KEY ?? null;
    case 'mistral':
      return env().MISTRAL_API_KEY ?? null;
  }
}

export function getModel(provider: Provider, model: string, byoApiKey?: string | null) {
  if (!ALLOWED_MODELS_BY_PROVIDER[provider].includes(model)) {
    throw new ModelNotAllowedError(provider, model);
  }
  const apiKey = resolveApiKey(provider, byoApiKey);
  if (!apiKey) throw new ProviderNotConfiguredError(provider);
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(model);
    case 'openai':
      return createOpenAI({ apiKey })(model);
    case 'mistral':
      return createMistral({ apiKey })(model);
  }
}
