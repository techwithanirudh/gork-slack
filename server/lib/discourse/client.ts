import { createClient } from '@hey-api/client-fetch';
import { env } from '~/env';

const url = env.DISCOURSE_URL;

export const client = createClient({
  baseUrl: url,
  headers: {
    'Api-Key': env.DISCOURSE_BOT_TOKEN,
  },
});
