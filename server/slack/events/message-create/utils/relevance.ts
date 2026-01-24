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
    const userId = (context.event as { user?: string }).user;
    const messageText = (context.event as { text?: string }).text ?? '';
    const files = (context.event as { files?: SlackFile[] }).files;
    const authorName = userId
      ? await getSlackUserName(context.client, userId)
      : 'user';

    // Process images from the current message for relevance assessment
    const imageContents = await processSlackFiles(files);

    // Build messages with current message images if present
    let relevanceMessages = messages;
    if (imageContents.length > 0) {
      // Add the current message with images to the context
      const currentMessageContent: UserContent = [
        { type: 'text' as const, text: `${authorName}: ${messageText}` },
        ...imageContents,
      ];
      relevanceMessages = [
        ...messages,
        {
          role: 'user' as const,
          content: currentMessageContent,
        },
      ];
    }

    const { output } = await generateText({
      model: provider.languageModel('relevance-model'),
      messages: relevanceMessages,
      output: Output.object({
        schema: probabilitySchema,
      }),
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
