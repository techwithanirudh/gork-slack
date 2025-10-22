import { addMemory } from '~/lib/pinecone/queries';
import { getConversationMessages } from '~/slack/conversations';
import type { SlackMessageContext } from '~/types';
import { buildHistorySnippet } from '~/utils/messages';
import logger from '../logger';

async function buildLocationFromMessage(message: SlackMessageContext) {
  const channelId =
    (message.event as { channel?: string }).channel ?? 'unknown';
  let channelName = channelId;

  try {
    const info = await message.client.conversations.info({
      channel: channelId,
    });
    if (info.channel?.is_im) {
      channelName = 'Direct Message';
    } else {
      channelName =
        info.channel?.name_normalized ?? info.channel?.name ?? channelName;
    }
  } catch {
    // ignore lookup failures
  }

  let guildName = 'Slack Workspace';
  try {
    const info = await message.client.team.info();
    guildName = info.team?.name ?? guildName;
  } catch {
    // ignore
  }

  return {
    guild: {
      id: message.teamId ?? null,
      name: guildName,
    },
    channel: {
      id: channelId,
      name: channelName,
    },
  } as const;
}

export async function saveChatMemory(
  message: SlackMessageContext,
  contextLimit = 5,
) {
  const channelId = (message.event as { channel?: string }).channel;
  const messageTs = (message.event as { ts?: string }).ts;
  const threadTs = (message.event as { thread_ts?: string }).thread_ts;

  if (!channelId || !messageTs) return;

  const history = await getConversationMessages({
    client: message.client,
    channel: channelId,
    threadTs,
    botUserId: message.botUserId,
    limit: contextLimit,
    latest: messageTs,
    inclusive: true,
  });

  const data = buildHistorySnippet(history, contextLimit);

  if (!data) return;

  const { guild, channel } = await buildLocationFromMessage(message);

  const metadata = {
    type: 'chat' as const,
    context: data,
    createdAt: Date.now(),
    lastRetrievalTime: Date.now(),
    guild,
    channel,
  };

  await addMemory(data, metadata);
}

export async function saveToolMemory(
  message: SlackMessageContext,
  toolName: string,
  result: unknown,
) {
  const data = JSON.stringify({ toolName, result }, null, 2);
  const { guild, channel } = await buildLocationFromMessage(message);

  const metadata = {
    type: 'tool' as const,
    name: toolName,
    response: result,
    createdAt: Date.now(),
    guild,
    channel,
  };

  await addMemory(data, metadata);
}
