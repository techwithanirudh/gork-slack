import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import { generateObject, type ModelMessage } from 'ai';
import { jsonrepair } from 'jsonrepair';
import { systemPrompt } from '~/lib/ai/prompts';
import { provider } from '~/lib/ai/providers';
import logger from '~/lib/logger';
import { type Probability, probabilitySchema } from '~/lib/validators';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { getSlackUserName } from '~/utils/users';

export async function assessRelevance(
  context: SlackMessageContext,
  messages: ModelMessage[],
  hints: RequestHints,
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[],
): Promise<Probability> {
  try {
    const userId = (context.event as { user?: string }).user;
    const messageText = (context.event as { text?: string }).text ?? '';
    const authorName = userId
      ? await getSlackUserName(context.client, userId)
      : 'user';

    const { object } = await generateObject({
      model: provider.languageModel('relevance-model'),
      messages,
      schema: probabilitySchema,
      temperature: 0.9,
      system: systemPrompt({
        selectedChatModel: 'relevance-model',
        requestHints: hints,
        memories,
        message: { author: authorName, content: messageText },
      }),
      experimental_repairText: async ({ text, error }) => {
        logger.info(
          { originalText: text, error },
          '[experimental_repairText] invoked',
        );

        try {
          const repaired = jsonrepair(text);

          const parsed = JSON.parse(repaired);
          const result = probabilitySchema.safeParse(parsed);

          if (!result.success) {
            throw new Error('Schema validation failed');
          }

          return JSON.stringify(result);
        } catch (err) {
          logger.error(
            { err },
            '[experimental_repairText] repair failed, falling back to model',
          );

          const { object: repaired } = await generateObject({
            model: provider.languageModel('chat-model'),
            schema: probabilitySchema,
            prompt: [
              'The model tried to output JSON with the following data:',
              text,
              'and encountered an error:',
              String(error?.cause ?? ''),
              'The tool accepts the following schema:',
              `{ "probability": number, "reason": string }`,
              'Please fix the outputs.',
            ].join('\n'),
          });

          return JSON.stringify(repaired);
        }
      },
      mode: 'json',
      experimental_telemetry: {
        isEnabled: true,
        functionId: `relevance`,
      },
    });
    return object;
  } catch (error) {
    logger.error({ error }, 'Failed to assess relevance');
    return {
      probability: 0.5,
      reason: 'Oops! Something went wrong, please try again later',
    };
  }
}
