import { customProvider } from 'ai';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { env } from '~/env';

const hackclub = createOpenAICompatible({
  name: 'hackclub',
  apiKey: env.HACKCLUB_API_KEY,
  baseURL: 'https://ai.hackclub.com',
});

export const myProvider = customProvider({
  languageModels: {
    'chat-model': hackclub('llama-3.3-70b-versatile'),
    'artifact-model': hackclub('llama-3.3-70b-versatile'),
  },
  imageModels: {
    // 'small-model': openai.image('dall-e-2'),
  },
});
