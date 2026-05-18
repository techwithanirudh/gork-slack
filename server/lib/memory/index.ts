import { addMemory } from '~/lib/pinecone/queries';
import { getConversationMessages } from '~/slack/conversations';
import type { SlackMessageContext } from '~/types';
import { buildHistorySnippet } from '~/utils/messages';

export interface ChatMemoryLocation {
  channelName: string;
  guildName: string;
}

export async function saveChatMemory(
  message: SlackMessageContext,
  location: ChatMemoryLocation,
  contextLimit = 5
) {
  const {
    channel: channelId,
    ts: messageTs,
    thread_ts: threadTs,
  } = message.event;

  if (!(channelId && messageTs)) {
    return;
  }

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
  if (!data) {
    return;
  }

  const metadata = {
    type: 'chat' as const,
    context: data,
    createdAt: Date.now(),
    lastRetrievalTime: Date.now(),
    guild: { id: message.teamId ?? null, name: location.guildName },
    channel: { id: channelId, name: location.channelName },
  };
  await addMemory(data, metadata);
}
