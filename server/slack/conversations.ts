import type { ConversationsHistoryResponse, WebClient } from '@slack/web-api';
import type { ModelMessage, UserContent } from 'ai';
import logger from '~/lib/logger';
import { processSlackFiles, type SlackFile } from '~/utils/images';
import { getSlackUserName } from '~/utils/users';

interface ConversationOptions {
  botUserId?: string;
  channel: string;
  client: WebClient;
  inclusive?: boolean;
  latest?: string;
  limit?: number;
  oldest?: string;
  threadTs?: string;
}

type SlackMessage = NonNullable<
  ConversationsHistoryResponse['messages']
>[number];

export async function getConversationMessages({
  client,
  channel,
  threadTs,
  botUserId,
  limit = 40,
  latest,
  oldest,
  inclusive = false,
}: ConversationOptions): Promise<ModelMessage[]> {
  try {
    const response = threadTs
      ? await client.conversations.replies({
          channel,
          ts: threadTs,
          limit,
          latest,
          oldest,
          inclusive,
        })
      : await client.conversations.history({
          channel,
          limit,
          latest,
          oldest,
          inclusive,
        });

    const messages = (response.messages as SlackMessage[] | undefined) ?? [];

    const filteredMessages = latest
      ? messages.filter((message) => {
          if (!message.ts) {
            return false;
          }
          if (message.text?.startsWith('##')) {
            return false;
          }
          const messageTs = Number(message.ts);
          const latestTs = Number(latest);
          return inclusive ? messageTs <= latestTs : messageTs < latestTs;
        })
      : messages;

    const mentionRegex = botUserId ? new RegExp(`<@${botUserId}>`, 'gi') : null;

    const sortedMessages = filteredMessages
      .filter((message) => !message.subtype || message.subtype === 'file_share')
      .sort((a, b) => {
        const aTs = Number(a.ts ?? '0');
        const bTs = Number(b.ts ?? '0');
        return aTs - bTs;
      });

    const modelMessages: ModelMessage[] = [];
    for (const message of sortedMessages) {
      const isBot = message.user === botUserId || Boolean(message.bot_id);
      const original = message.text ?? '';
      const cleaned = mentionRegex
        ? original.replace(mentionRegex, '').trim()
        : original.trim();

      const textContent = cleaned.length > 0 ? cleaned : original;

      const author = message.user
        ? await getSlackUserName(client, message.user)
        : (message.bot_id ?? 'unknown');

      const formattedText = `${author} (${message.user}): ${textContent}`;

      if (isBot) {
        modelMessages.push({ role: 'assistant', content: formattedText });
      } else {
        const images = await processSlackFiles(
          message.files as SlackFile[] | undefined
        );
        modelMessages.push({
          role: 'user',
          content: (images.length
            ? [{ type: 'text', text: formattedText }, ...images]
            : formattedText) as UserContent,
        });
      }
    }

    return modelMessages;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'data' in error &&
      (error as { data?: { error?: string } }).data?.error === 'not_in_channel'
    ) {
      throw error;
    }
    logger.error(
      { error, channel, threadTs },
      'Failed to fetch conversation history'
    );
    return [];
  }
}
