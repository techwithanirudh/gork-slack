import type { WebClient } from '@slack/web-api';
import type { ModelMessage, UserContent } from 'ai';
import logger from '~/lib/logger';
import { processSlackFiles, type SlackFile } from '~/utils/images';
import { shouldUse } from '~/utils/messages';

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

interface SlackMessage {
  bot_id?: string;
  files?: SlackFile[];
  reply_count?: number;
  subtype?: string;
  text?: string;
  ts?: string;
  user?: string;
}

async function buildUserNameCache(
  client: WebClient,
  messages: SlackMessage[]
): Promise<Map<string, string>> {
  const userIds = new Set<string>();
  for (const message of messages) {
    if (message.user) {
      userIds.add(message.user);
    }
  }

  const cache = new Map<string, string>();
  await Promise.all(
    Array.from(userIds).map(async (userId) => {
      try {
        const info = await client.users.info({ user: userId });
        const name =
          info.user?.profile?.display_name ||
          info.user?.real_name ||
          info.user?.name ||
          userId;
        cache.set(userId, name);
      } catch (error) {
        logger.warn({ error, userId }, 'Failed to fetch Slack user info');
        cache.set(userId, userId);
      }
    })
  );

  return cache;
}

const MAX_THREADS_TO_EXPAND = 10;

async function expandThreads(
  client: WebClient,
  channel: string,
  channelMessages: SlackMessage[],
  latest?: string
): Promise<SlackMessage[]> {
  // Only expand the most recent threads to keep API calls bounded
  const threaded = channelMessages
    .filter((m) => m.reply_count && m.ts)
    .slice(-MAX_THREADS_TO_EXPAND);

  if (threaded.length === 0) {
    return channelMessages;
  }

  const threadResults = await Promise.all(
    threaded.map(async (parent) => {
      try {
        const resp = await client.conversations.replies({
          channel,
          ts: parent.ts ?? '',
          limit: 50,
          latest,
          inclusive: false,
        });
        return (resp.messages ?? []) as SlackMessage[];
      } catch (error) {
        logger.warn(
          { error, parentTs: parent.ts },
          'Failed to fetch thread replies'
        );
        return [];
      }
    })
  );

  const seen = new Set<string>();
  const flat: SlackMessage[] = [];

  for (const msg of [...channelMessages, ...threadResults.flat()]) {
    if (!msg.ts || seen.has(msg.ts)) {
      continue;
    }
    seen.add(msg.ts);
    flat.push(msg);
  }

  return flat;
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
    let rawMessages: SlackMessage[];

    if (threadTs) {
      const response = await client.conversations.replies({
        channel,
        ts: threadTs,
        limit,
        latest,
        oldest,
        inclusive,
      });
      rawMessages = (response.messages as SlackMessage[] | undefined) ?? [];
    } else {
      const response = await client.conversations.history({
        channel,
        limit,
        latest,
        oldest,
        inclusive,
      });
      const channelMessages =
        (response.messages as SlackMessage[] | undefined) ?? [];
      rawMessages = await expandThreads(
        client,
        channel,
        channelMessages,
        latest
      );
    }

    const mentionRegex = botUserId ? new RegExp(`<@${botUserId}>`, 'gi') : null;

    const sortedMessages = rawMessages
      .filter((message) => {
        if (!message.ts) {
          return false;
        }
        if (message.subtype && message.subtype !== 'file_share') {
          return false;
        }
        if (!shouldUse(message.text || '')) {
          return false;
        }
        if (!latest) {
          return true;
        }
        const mTs = Number(message.ts);
        const latestTs = Number(latest);
        return inclusive ? mTs <= latestTs : mTs < latestTs;
      })
      .sort((a, b) => Number(a.ts ?? '0') - Number(b.ts ?? '0'))
      .slice(-limit);

    const userNameCache = await buildUserNameCache(client, sortedMessages);

    const modelMessages: ModelMessage[] = await Promise.all(
      sortedMessages.map(async (message): Promise<ModelMessage> => {
        const isBot = message.user === botUserId || Boolean(message.bot_id);
        const original = message.text ?? '';
        const cleaned = mentionRegex
          ? original.replace(mentionRegex, '').trim()
          : original.trim();
        const textContent = cleaned.length > 0 ? cleaned : original;

        const author = message.user
          ? (userNameCache.get(message.user) ?? message.user)
          : (message.bot_id ?? 'unknown');
        const formattedText = `${author} (${message.user}): ${textContent}`;

        if (isBot) {
          return { role: 'assistant' as const, content: formattedText };
        }

        const imageContents = await processSlackFiles(
          (message as SlackMessage & { files?: SlackFile[] }).files
        );

        if (imageContents.length > 0) {
          const contentParts: UserContent = [
            { type: 'text' as const, text: formattedText },
            ...imageContents,
          ];
          return { role: 'user' as const, content: contentParts };
        }

        return { role: 'user' as const, content: formattedText };
      })
    );

    return modelMessages;
  } catch (error) {
    logger.error(
      { error, channel, threadTs },
      'Failed to fetch conversation history'
    );
    return [];
  }
}
