import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider, wrapProvider } from 'ai';
import {
  createRetryable,
  isErrorAttempt,
  type LanguageModel,
  type RetryContext,
} from 'ai-retry';
import { requestNotRetryable } from 'ai-retry/retryables';
import { env } from '~/env';
import logger from '~/lib/logger';
import { errorMessage } from '~/utils/error';

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

const onModelError = (context: RetryContext<LanguageModel>) => {
  const { model } = context.current;
  logger.error(
    {
      error: isErrorAttempt(context.current)
        ? errorMessage(context.current.error)
        : undefined,
    },
    `error with model ${model.provider}/${model.modelId}, switching to next model`
  );
};

const chatModel = createRetryable({
  model: hackclub.languageModel('google/gemini-3-flash-preview'),
  retries: [
    requestNotRetryable(
      openrouter.languageModel('google/gemini-3-flash-preview')
    ),
    hackclub.languageModel('openai/gpt-5-mini'),
    openrouter.languageModel('google/gemini-3-flash-preview'),
    openrouter.languageModel('openai/gpt-5-mini'),
  ],
  onError: onModelError,
});

const relevanceModel = createRetryable({
  model: hackclub.languageModel('openai/gpt-5-mini'),
  retries: [
    requestNotRetryable(openrouter.languageModel('openai/gpt-5-mini')),
    hackclub.languageModel('google/gemini-2.5-flash'),
    openrouter.languageModel('google/gemini-2.5-flash-lite'),
    openrouter.languageModel('openai/gpt-5-mini'),
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
