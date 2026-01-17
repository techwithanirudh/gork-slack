import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider } from 'ai';
import { createFallback } from 'ai-fallback';
import { env } from '~/env';
import logger from '~/lib/logger';

const hackclub = createOpenRouter({
  apiKey: env.HACKCLUB_API_KEY,
  baseURL: 'https://ai.hackclub.com/proxy/v1',
});

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const chatModel = createFallback({
  models: [
    hackclub('google/gemini-3-flash-preview'),
    hackclub('google/gemini-2.5-flash'),
    hackclub('openai/gpt-5-mini'),
    openrouter('google/gemini-3-flash-preview'),
    openrouter('google/gemini-2.5-flash'),
    openrouter('openai/gpt-5-mini'),
    // hackclub?
  ],
  onError: (_error, modelId) => {
    logger.error(`error with model ${modelId}, switching to next model`);
  },
  modelResetInterval: 60_000,
});

const relevanceModel = createFallback({
  models: [
    hackclub('openai/gpt-5-mini'),
    hackclub('google/gemini-2.5-flash'),
    openrouter('google/gemini-2.5-flash-lite'),
    openrouter('openai/gpt-5-mini'),
  ],
  onError: (_error, modelId) => {
    logger.error(`error with model ${modelId}, switching to next model`);
  },
  modelResetInterval: 60_000,
});

const sfwFilterModel = createFallback({
  models: [
    hackclub('openai/gpt-5-nano'),
    hackclub('google/gemini-2.5-flash-lite'),
    openrouter('openai/gpt-5-nano'),
    openrouter('google/gemini-2.5-flash-lite'),
  ],
  onError: (_error, modelId) => {
    logger.error(`error with model ${modelId}, switching to next model`);
  },
  modelResetInterval: 60_000,
});

export const provider = customProvider({
  languageModels: {
    'chat-model': chatModel,
    'relevance-model': relevanceModel,
    'sfw-filter-model': sfwFilterModel,
  },
});
