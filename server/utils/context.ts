import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { ModelMessage } from 'ai';
import { getConversationMessages } from '~/slack/conversations';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { buildRequestHints } from '~/utils/context-hints';
import { buildContextMemories } from '~/utils/context-memories';

export async function buildChatContext(
  ctx: SlackMessageContext,
  opts?: {
    messages?: ModelMessage[];
    hints?: RequestHints;
    memories?: ScoredPineconeRecord<PineconeMetadataOutput>[];
  }
) {
  let messages = opts?.messages;
  let hints = opts?.hints;
  let memories = opts?.memories;

  const {
    channel: channelId,
    thread_ts: threadTs,
    ts: messageTs,
    text = '',
    user: userId,
  } = ctx.event;

  if (!(channelId && messageTs)) {
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
    hints = await buildRequestHints(ctx);
  }

  if (!memories) {
    memories = await buildContextMemories({ ctx, messages, text, userId });
  }

  return { messages, hints, memories };
}

export type ChatContext = Awaited<ReturnType<typeof buildChatContext>>;
