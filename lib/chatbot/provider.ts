import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { env } from '@/lib/env';
import { ALLOWED_MODELS_BY_PROVIDER } from './pricing';

export type Provider = 'anthropic' | 'openai' | 'mistral';

export class ProviderNotConfiguredError extends Error {
  constructor(provider: Provider) {
    super(`Provider ${provider} has no API key in environment`);
  }
}

export class ModelNotAllowedError extends Error {
  constructor(provider: Provider, model: string) {
    super(`Model ${model} not in allowlist for provider ${provider}`);
  }
}

export function getModel(provider: Provider, model: string) {
  if (!ALLOWED_MODELS_BY_PROVIDER[provider].includes(model)) {
    throw new ModelNotAllowedError(provider, model);
  }
  switch (provider) {
    case 'anthropic': {
      const apiKey = env().ANTHROPIC_API_KEY;
      if (!apiKey) throw new ProviderNotConfiguredError(provider);
      return createAnthropic({ apiKey })(model);
    }
    case 'openai': {
      const apiKey = env().OPENAI_API_KEY;
      if (!apiKey) throw new ProviderNotConfiguredError(provider);
      return createOpenAI({ apiKey })(model);
    }
    case 'mistral': {
      const apiKey = env().MISTRAL_API_KEY;
      if (!apiKey) throw new ProviderNotConfiguredError(provider);
      return createMistral({ apiKey })(model);
    }
  }
}
