import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import { generateText, type ModelMessage, Output, type UserContent } from 'ai';
import { systemPrompt } from '~/lib/ai/prompts';
import { provider } from '~/lib/ai/providers';
import logger from '~/lib/logger';
import { type Probability, probabilitySchema } from '~/lib/validators';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { processSlackFiles, type SlackFile } from '~/utils/images';
import { getSlackUserName } from '~/utils/users';

export async function assessRelevance(
  context: SlackMessageContext,
  messages: ModelMessage[],
  hints: RequestHints,
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[]
): Promise<Probability> {
  try {
    const { user: userId, text: messageText = '' } = context.event;
    const files = (context.event as { files?: SlackFile[] }).files;
    const authorName = userId
      ? await getSlackUserName(context.client, userId)
      : 'user';

    const images = await processSlackFiles(files);
    let relevanceMessages = messages;
    if (images.length > 0) {
      relevanceMessages = [
        ...messages,
        {
          role: 'user',
          content: [
            { type: 'text', text: `${authorName}: ${messageText}` },
            ...images,
          ] as UserContent,
        },
      ];
    }

    const { output } = await generateText({
      model: provider.languageModel('relevance-model'),
      messages: relevanceMessages,
      output: Output.object({
        schema: probabilitySchema,
      }),
      maxOutputTokens: 8192,
      temperature: 0.9,
      system: systemPrompt({
        selectedChatModel: 'relevance-model',
        requestHints: hints,
        memories,
        message: { author: authorName, content: messageText },
      }),
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'relevance',
      },
    });
    return output;
  } catch (error) {
    logger.error({ error }, 'Failed to assess relevance');
    return {
      probability: 0.5,
      reason: 'Oops! Something went wrong, please try again later',
    };
  }
}
