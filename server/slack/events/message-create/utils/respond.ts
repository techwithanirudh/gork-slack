import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { ModelMessage } from 'ai';
import { generateText, stepCountIs } from 'ai';
import { systemPrompt } from '~/lib/ai/prompts';
import { provider } from '~/lib/ai/providers';
import { getUserInfo } from '~/lib/ai/tools/get-user-info';
import { getWeather } from '~/lib/ai/tools/get-weather';
import { react } from '~/lib/ai/tools/react';
import { reply } from '~/lib/ai/tools/reply';
import { searchMemories } from '~/lib/ai/tools/search-memories';
import { searchWeb } from '~/lib/ai/tools/search-web';
import { skip } from '~/lib/ai/tools/skip';
import { startDM } from '~/lib/ai/tools/start-dm';
import { successToolCall } from '~/lib/ai/utils';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { getSlackUserName } from '~/utils/users';

export async function generateResponse(
  context: SlackMessageContext,
  messages: ModelMessage[],
  hints: RequestHints,
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[],
) {
  try {
    const userId = (context.event as { user?: string }).user;
    const messageText = (context.event as { text?: string }).text ?? '';
    const authorName = userId
      ? await getSlackUserName(context.client, userId)
      : 'user';

    const system = systemPrompt({
      selectedChatModel: 'chat-model',
      requestHints: hints,
      memories,
      message: {
        author: authorName,
        authorSlackId: userId,
        content: messageText,
      },
    });

    const { toolCalls } = await generateText({
      model: provider.languageModel('chat-model'),
      messages: [
        ...messages,
        {
          role: 'user',
          content: `You are replying to the following message: ${messageText}`,
        },
      ],
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 250,
          },
        },
      },
      temperature: 1.1,
      activeTools: [
        'getWeather',
        'searchWeb',
        'startDM',
        'getUserInfo',
        'searchMemories',
        'react',
        'reply',
        'skip',
      ],
      toolChoice: 'required',
      tools: {
        getWeather,
        searchWeb,
        startDM: startDM({ context }),
        getUserInfo: getUserInfo({ context }),
        searchMemories: searchMemories(),
        react: react({ context }),
        reply: reply({ context }),
        skip: skip({ context }),
      },
      system,
      stopWhen: [
        stepCountIs(10),
        successToolCall('reply'),
        // successToolCall('react'),
        successToolCall('skip'),
      ],
      experimental_telemetry: {
        isEnabled: true,
        functionId: `chat`,
      },
    });

    return { success: true, toolCalls };
  } catch (e) {
    return {
      success: false,
      error: (e as Error)?.message,
    };
  }
}
