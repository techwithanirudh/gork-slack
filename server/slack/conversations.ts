import type { WebClient } from '@slack/web-api';
import type { ModelMessage } from 'ai';
import logger from '~/lib/logger';

interface ConversationOptions {
  client: WebClient;
  channel: string;
  threadTs?: string;
  botUserId?: string;
  limit?: number;
}

interface SlackMessage {
  text?: string;
  user?: string;
  bot_id?: string;
  subtype?: string;
  ts?: string;
}

export async function getConversationMessages({
  client,
  channel,
  threadTs,
  botUserId,
  limit = 40,
}: ConversationOptions): Promise<ModelMessage[]> {
  try {
    const response = threadTs
      ? await client.conversations.replies({ channel, ts: threadTs, limit })
      : await client.conversations.history({ channel, limit });

    const messages = (response.messages as SlackMessage[] | undefined) ?? [];

    const mentionRegex = botUserId ? new RegExp(`<@${botUserId}>`, 'gi') : null;

    return messages
      .filter((message) => !message.subtype)
      .sort((a, b) => {
        const aTs = Number(a.ts ?? '0');
        const bTs = Number(b.ts ?? '0');
        return aTs - bTs;
      })
      .map((message) => {
        const isBot = message.user === botUserId || Boolean(message.bot_id);
        const original = message.text ?? '';
        const cleaned = mentionRegex
          ? original.replace(mentionRegex, '').trim()
          : original.trim();

        const content = cleaned.length > 0 ? cleaned : original;

        return {
          role: isBot ? 'assistant' : 'user',
          content: `${message.user ?? 'unknown'}: ${content}`,
        } satisfies ModelMessage;
      });
  } catch (error) {
    logger.error(
      { error, channel, threadTs },
      'Failed to fetch conversation history',
    );
    return [];
  }
}
