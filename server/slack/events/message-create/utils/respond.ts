import { webSearch } from '@exalabs/ai-sdk';
import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { ModelMessage, UserContent } from 'ai';
import { generateText, stepCountIs } from 'ai';
import { systemPrompt } from '~/lib/ai/prompts';
import { provider } from '~/lib/ai/providers';
import { getUserInfo } from '~/lib/ai/tools/get-user-info';
import { getWeather } from '~/lib/ai/tools/get-weather';
import { leaveChannel } from '~/lib/ai/tools/leave-channel';
import { react } from '~/lib/ai/tools/react';
import { reply } from '~/lib/ai/tools/reply';
import { report } from '~/lib/ai/tools/report';
import { searchMemories } from '~/lib/ai/tools/search-memories';
import { skip } from '~/lib/ai/tools/skip';
import { successToolCall } from '~/lib/ai/utils';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { processSlackFiles, type SlackFile } from '~/utils/images';
import { getSlackUserName } from '~/utils/users';

export async function generateResponse(
  context: SlackMessageContext,
  messages: ModelMessage[],
  hints: RequestHints,
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[]
) {
  try {
    const userId = (context.event as { user?: string }).user;
    const messageText = (context.event as { text?: string }).text ?? '';
    const files = (context.event as { files?: SlackFile[] }).files;
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

    // Process images from the current message
    const imageContents = await processSlackFiles(files);

    // Build the current message content
    let currentMessageContent: UserContent;
    const replyPrompt = `You are replying to the following message from ${authorName} (${userId}): ${messageText}`;

    if (imageContents.length > 0) {
      // Include images with the reply prompt
      currentMessageContent = [
        { type: 'text' as const, text: replyPrompt },
        ...imageContents,
      ];
    } else {
      currentMessageContent = replyPrompt;
    }

    const { toolCalls } = await generateText({
      model: provider.languageModel('chat-model'),
      messages: [
        ...messages,
        {
          role: 'user',
          content: currentMessageContent,
        },
      ],
      providerOptions: {
        openrouter: {
          reasoning: {
            enabled: true,
            exclude: false,
            effort: 'medium',
          },
        },
      },
      temperature: 1.1,
      toolChoice: 'required',
      tools: {
        getWeather,
        searchWeb: webSearch({
          numResults: 10,
          type: 'auto',
        }),
        getUserInfo: getUserInfo({ context }),
        searchMemories: searchMemories(),
        leaveChannel: leaveChannel({ context }),
        react: react({ context }),
        reply: reply({ context }),
        report: report({ context }),
        skip: skip({ context }),
      },
      system,
      stopWhen: [
        stepCountIs(10),
        successToolCall('leave-channel'),
        successToolCall('reply'),
        successToolCall('report'),
        successToolCall('skip'),
      ],
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'chat',
        metadata: {
          userId: userId || 'unknown-user',
        },
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
