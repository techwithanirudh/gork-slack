import { createCohere } from '@ai-sdk/cohere';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider } from 'ai';
import { createFallback } from 'ai-fallback';
import { env } from '~/env';
import logger from '~/lib/logger';

// import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
// const hackclub = createOpenAICompatible({
//   name: 'hackclub',
//   apiKey: env.HACKCLUB_API_KEY,
//   baseURL: 'https://ai.hackclub.com',
// });

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const cohere = createCohere({
  apiKey: env.COHERE_API_KEY,
});

const chatModel = createFallback({
  models: [
    openrouter('google/gemini-2.5-flash'),
    openrouter('x-ai/grok-4-fast'),
    openrouter('openai/gpt-oss-120b'),
    // hackclub?
  ],
  onError: (_error, modelId) => {
    logger.error(`error with model ${modelId}, switching to next model`);
  },
  modelResetInterval: 60000,
});

const relevanceModel = createFallback({
  models: [
    openrouter('openai/gpt-oss-120b'),
    openrouter('google/gemini-2.5-flash-lite'),
    openrouter('x-ai/grok-4-fast'),
  ],
  onError: (_error, modelId) => {
    logger.error(`error with model ${modelId}, switching to next model`);
  },
  modelResetInterval: 60000,
});

export const provider = customProvider({
  languageModels: {
    'chat-model': chatModel,
    'relevance-model': relevanceModel,
  },
  textEmbeddingModels: {
    // TODO
    'small-model': cohere.embedding('embed-english-v3.0'),
    'large-model': cohere.embedding('embed-english-v3.0'),
  },
});
