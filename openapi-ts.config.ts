import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi.json',
  output: {
    format: 'biome',
    lint: 'biome',
    path: './client',
  },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/schemas',
    // 'zod',
    {
      dates: true,
      name: '@hey-api/transformers',
    },
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
    {
      name: '@hey-api/sdk',
      transformer: true,
      // validator: true,
    },
  ],
});
