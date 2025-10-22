import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { ModelMessage } from 'ai';
import { city, country, memories as memoriesConfig, timezone } from '~/config';
import logger from '~/lib/logger';
import { queryMemories } from '~/lib/pinecone/operations';
import { getConversationMessages } from '~/slack/conversations';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { buildHistorySnippet } from '~/utils/messages';
import { getTimeInCity } from '~/utils/time';
import { getSlackUserName } from '~/utils/users';

async function resolveChannelName(ctx: SlackMessageContext): Promise<string> {
  const channelId = (ctx.event as { channel?: string }).channel;
  if (!channelId) return 'Unknown channel';

  try {
    const info = await ctx.client.conversations.info({ channel: channelId });
    const channel = info.channel;
    if (!channel) return channelId;
    if (channel.is_im) return 'Direct Message';
    return channel.name_normalized ?? channel.name ?? channelId;
  } catch {
    return channelId;
  }
}

async function resolveServerName(ctx: SlackMessageContext): Promise<string> {
  try {
    const info = await ctx.client.team.info();
    return info.team?.name ?? 'Slack Workspace';
  } catch {
    return 'Slack Workspace';
  }
}

async function resolveBotDetails(
  ctx: SlackMessageContext,
): Promise<{ joined: number; status: string; activity: string }> {
  const botId = ctx.botUserId;
  if (!botId) {
    return { joined: Date.now(), status: 'active', activity: 'none' };
  }

  try {
    const info = await ctx.client.users.info({ user: botId });
    const joinedSeconds =
      (info.user as { updated?: number; created?: number } | undefined)
        ?.created ??
      info.user?.updated ??
      Math.floor(Date.now() / 1000);
    const status =
      info.user?.profile?.status_text?.trim() ||
      info.user?.profile?.status_emoji?.trim() ||
      'active';
    return {
      joined: joinedSeconds * 1000,
      status,
      activity: info.user?.profile?.status_text?.trim() || 'none',
    };
  } catch {
    return { joined: Date.now(), status: 'active', activity: 'none' };
  }
}

export async function buildChatContext(
  ctx: SlackMessageContext,
  opts?: {
    messages?: ModelMessage[];
    hints?: RequestHints;
    memories?: ScoredPineconeRecord<PineconeMetadataOutput>[];
  },
) {
  let messages = opts?.messages;
  let hints = opts?.hints;
  let memories = opts?.memories;

  const channelId = (ctx.event as { channel?: string }).channel;
  const threadTs = (ctx.event as { thread_ts?: string }).thread_ts;
  const messageTs = (ctx.event as { ts?: string }).ts;
  const text = (ctx.event as { text?: string }).text ?? '';
  const userId = (ctx.event as { user?: string }).user;

  if (!channelId || !messageTs) {
    throw new Error('Slack message missing channel or timestamp');
  }

  if (!messages) {
    messages = await getConversationMessages({
      client: ctx.client,
      channel: channelId,
      threadTs,
      botUserId: ctx.botUserId,
      limit: 50,
      latest: messageTs,
      inclusive: false,
    });
  }

  if (!hints) {
    const [channelName, serverName, botDetails] = await Promise.all([
      resolveChannelName(ctx),
      resolveServerName(ctx),
      resolveBotDetails(ctx),
    ]);

    hints = {
      channel: channelName,
      time: getTimeInCity(timezone),
      city,
      country,
      server: serverName,
      joined: botDetails.joined,
      status: botDetails.status,
      activity: botDetails.activity,
    };
  }

  if (!memories) {
    const historySnippet = buildHistorySnippet(messages, 3);
    const authorName = userId
      ? await getSlackUserName(ctx.client, userId)
      : 'unknown';
    const currentMessage = `${authorName}: ${text}`;

    const [
      memories0,
      memories1,
      memories2,
      memories3,
      memories4,
      memories5,
      memories6,
    ] = await Promise.all([
      queryMemories(text, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
      }),
      queryMemories(historySnippet, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
      }),
      queryMemories(historySnippet, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
        ageLimit: 1000 * 60 * 60,
      }),
      queryMemories(currentMessage, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
      }),
      queryMemories(currentMessage, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
        ageLimit: 1000 * 60 * 60,
      }),
      queryMemories(historySnippet, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
        ignoreRecent: false,
        onlyTools: true,
      }),
      queryMemories(historySnippet, {
        namespace: 'default',
        limit: memoriesConfig.eachLimit,
        ignoreRecent: false,
        onlyTools: true,
        ageLimit: 1000 * 60 * 60,
      }),
    ]);

    const memoryLists = [
      memories6,
      memories1,
      memories4,
      memories3,
      memories5,
      memories0,
      memories2,
    ];

    const combined: ScoredPineconeRecord<PineconeMetadataOutput>[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < memoriesConfig.eachLimit; i++) {
      for (let j = 0; j < memoryLists.length; j++) {
        const list = memoryLists[j] ?? [];
        if (i < list.length && combined.length < memoriesConfig.maxMemories) {
          const mem = list[i];
          if (!mem) continue;
          const id = mem.id ?? '';
          if (!id) continue;
          if (!seen.has(id)) {
            seen.add(id);
            combined.push(mem);
            if (combined.length === memoriesConfig.maxMemories) {
              break;
            }
          }
        }
      }
      if (combined.length === memoriesConfig.maxMemories) break;
    }

    memories = combined;
  }

  return { messages, hints, memories };
}
