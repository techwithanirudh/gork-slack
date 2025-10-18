import { customProvider } from 'ai';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { env } from '~/env';

const openrouter = createOpenAICompatible({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENROUTER_API_KEY,
  name: 'OpenRouter',
});

export const myProvider = customProvider({
  languageModels: {
    'chat-model': openrouter('x-ai/grok-4-fast'),
    'artifact-model': openrouter('x-ai/grok-4-fast'),
  },
  imageModels: {
    // 'small-model': openai.image('dall-e-2'),
  },
});
