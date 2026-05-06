import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { ALLOWED_MODELS_BY_PROVIDER } from './pricing';

export type Provider = 'anthropic' | 'openai' | 'mistral';

export class ProviderNotConfiguredError extends Error {
  code = 'provider_not_configured' as const;
  constructor(provider: Provider) {
    super(`Provider ${provider} has no per-cabinet API key configured`);
  }
}

export class ModelNotAllowedError extends Error {
  constructor(provider: Provider, model: string) {
    super(`Model ${model} not in allowlist for provider ${provider}`);
  }
}

/**
 * Returns a configured AI SDK model for the cabinet.
 *
 * Each cabinet MUST have its own API key (configured by the super-admin
 * via /admin/tenants/[id] → "Clé API du cabinet"). There is no
 * platform-wide fallback — usage and billing are isolated per tenant.
 *
 * Throws:
 *   - ModelNotAllowedError if `model` isn't in the allowlist for `provider`
 *   - ProviderNotConfiguredError if `apiKey` is missing or empty
 */
export function getModel(provider: Provider, model: string, apiKey: string | null) {
  if (!ALLOWED_MODELS_BY_PROVIDER[provider].includes(model)) {
    throw new ModelNotAllowedError(provider, model);
  }
  if (!apiKey || apiKey.length === 0) {
    throw new ProviderNotConfiguredError(provider);
  }
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(model);
    case 'openai':
      return createOpenAI({ apiKey })(model);
    case 'mistral':
      return createMistral({ apiKey })(model);
  }
}
