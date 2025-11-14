import type { WebClient } from '@slack/web-api';
import type { ModelMessage } from 'ai';
import logger from '~/lib/logger';

interface ConversationOptions {
  client: WebClient;
  channel: string;
  threadTs?: string;
  botUserId?: string;
  limit?: number;
  latest?: string;
  oldest?: string;
  inclusive?: boolean;
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
          if (!message.ts) return false;
          const messageTs = Number(message.ts);
          const latestTs = Number(latest);
          return inclusive ? messageTs <= latestTs : messageTs < latestTs;
        })
      : messages;

    const userIds = new Set<string>();
    for (const message of filteredMessages) {
      if (message.user) {
        userIds.add(message.user);
      }
    }

    const userNameCache = new Map<string, string>();
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        try {
          const info = await client.users.info({ user: userId });
          const name =
            info.user?.profile?.display_name ||
            info.user?.real_name ||
            info.user?.name ||
            userId;
          userNameCache.set(userId, name);
        } catch (error) {
          logger.warn({ error, userId }, 'Failed to fetch Slack user info');
          userNameCache.set(userId, userId);
        }
      }),
    );

    const mentionRegex = botUserId ? new RegExp(`<@${botUserId}>`, 'gi') : null;

    return filteredMessages
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

        const author = message.user
          ? (userNameCache.get(message.user) ?? message.user)
          : (message.bot_id ?? 'unknown');

        return {
          role: isBot ? 'assistant' : 'user',
          content: `${author} (${message.user}): ${content}`,
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
