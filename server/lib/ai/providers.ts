import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { APICallError, customProvider, wrapProvider } from 'ai';
import { createRetryable, type LanguageModel, type Retry } from 'ai-retry';
import { env } from '~/env';
import logger from '~/lib/logger';

const hackclubBase = createOpenRouter({
  apiKey: env.HACKCLUB_API_KEY,
  baseURL: 'https://ai.hackclub.com/proxy/v1',
});

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: env.OPENROUTER_BASE_URL ?? undefined,
});

const hackclub = wrapProvider({
  provider: hackclubBase,
  languageModelMiddleware: {
    specificationVersion: 'v3',
    overrideProvider: () => 'hackclub',
  },
  imageModelMiddleware: {
    specificationVersion: 'v3',
    overrideProvider: () => 'hackclub',
  },
});

const onModelError = (context: {
  current: { model: { provider: string; modelId: string }; error?: unknown };
}) => {
  const { model, error } = context.current;
  const err = APICallError.isInstance(error)
    ? { status: error.statusCode, message: error.message, url: error.url }
    : { message: error instanceof Error ? error.message : String(error) };
  logger.warn(
    { provider: model.provider, modelId: model.modelId, err },
    'model error, switching to next'
  );
};

const retry = (model: LanguageModel): Retry<LanguageModel> => ({
  model,
  backoffFactor: 2,
  delay: 250,
  maxAttempts: 2,
});

const chatModel = createRetryable({
  model: hackclub.languageModel('google/gemini-3-flash-preview'),
  retries: [
    retry(hackclub.languageModel('google/gemini-3-flash-preview')),
    retry(openrouter.languageModel('google/gemini-3-flash-preview')),
    retry(hackclub.languageModel('openai/gpt-5-mini')),
    retry(openrouter.languageModel('google/gemini-3-flash-preview')),
    retry(openrouter.languageModel('openai/gpt-5-mini')),
  ],
  onError: onModelError,
});

const relevanceModel = createRetryable({
  model: hackclub.languageModel('openai/gpt-5-mini'),
  retries: [
    retry(hackclub.languageModel('openai/gpt-5-mini')),
    retry(openrouter.languageModel('openai/gpt-5-mini')),
    retry(hackclub.languageModel('google/gemini-2.5-flash')),
    retry(openrouter.languageModel('google/gemini-2.5-flash-lite')),
    retry(openrouter.languageModel('openai/gpt-5-mini')),
  ],
  onError: onModelError,
});

export const provider = customProvider({
  languageModels: {
    'chat-model': chatModel,
    'relevance-model': relevanceModel,
  },
  imageModels: {
    'image-model': hackclub.imageModel('google/gemini-3.1-flash-image-preview'),
  },
});
