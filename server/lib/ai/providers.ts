import { customProvider } from 'ai';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '~/env';

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const myProvider = customProvider({
  languageModels: {
    'chat-model': openrouter('x-ai/grok-4-fast'),
    'artifact-model': openrouter('x-ai/grok-4-fast'),
  },
});
