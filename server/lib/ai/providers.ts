import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider } from 'ai';
import { createRetryable } from 'ai-retry';
import { env } from '~/env';
import logger from '~/lib/logger';

const hackclub = createOpenRouter({
  apiKey: env.HACKCLUB_API_KEY,
  baseURL: 'https://ai.hackclub.com/proxy/v1',
});

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const chatModel = createRetryable({
  model: hackclub('google/gemini-3-flash-preview'),
  retries: [
    hackclub('google/gemini-2.5-flash'),
    hackclub('openai/gpt-5-mini'),
    openrouter('google/gemini-3-flash-preview'),
    openrouter('google/gemini-2.5-flash'),
    openrouter('openai/gpt-5-mini'),
  ],
  onError: (context) => {
    const { model } = context.current;
    logger.error(
      `error with model ${model.provider}/${model.modelId}, switching to next model`
    );
  },
});

const relevanceModel = createRetryable({
  model: hackclub('openai/gpt-5-mini'),
  retries: [
    hackclub('google/gemini-2.5-flash'),
    openrouter('google/gemini-2.5-flash-lite'),
    openrouter('openai/gpt-5-mini'),
  ],
  onError: (context) => {
    const { model } = context.current;
    logger.error(
      `error with model ${model.provider}/${model.modelId}, switching to next model`
    );
  },
});

const sfwFilterModel = createRetryable({
  model: hackclub('openai/gpt-5-nano'),
  retries: [
    hackclub('google/gemini-2.5-flash-lite'),
    openrouter('openai/gpt-5-nano'),
    openrouter('google/gemini-2.5-flash-lite'),
  ],
  onError: (context) => {
    const { model } = context.current;
    logger.error(
      `error with model ${model.provider}/${model.modelId}, switching to next model`
    );
  },
});

export const provider = customProvider({
  languageModels: {
    'chat-model': chatModel,
    'relevance-model': relevanceModel,
    'sfw-filter-model': sfwFilterModel,
  },
});
