import { z } from 'zod/v4';

export const sfwFilterSchema = z.object({
  safe: z.boolean().describe('Whether the content is safe for work'),
  reason: z
    .string()
    .min(1)
    .describe('Explanation for why the content is safe or unsafe'),
});

export type SfwFilterResult = z.infer<typeof sfwFilterSchema>;
