import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { ModelMessage } from 'ai';
import { getConversationMessages } from '~/slack/conversations';
import type {
  PineconeMetadataOutput,
  RequestHints,
  SlackMessageContext,
} from '~/types';
import { buildRequestHints } from './hints';
import { buildContextMemories } from './memories';

export async function buildChatContext({
  ctx,
  messages: providedMessages,
  hints: providedHints,
  memories: providedMemories,
}: {
  ctx: SlackMessageContext;
  messages?: ModelMessage[];
  hints?: RequestHints;
  memories?: ScoredPineconeRecord<PineconeMetadataOutput>[];
}) {
  let messages = providedMessages;
  let hints = providedHints;
  let memories = providedMemories;

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
