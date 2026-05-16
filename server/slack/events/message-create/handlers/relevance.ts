import { messageThreshold } from '~/config';
import { isUserAllowed } from '~/lib/allowed-users';
import type { ResponseMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { saveChatMemory } from '~/lib/memory';
import { isUserBanned } from '~/lib/reports';
import type { SlackMessageContext } from '~/types';
import type { ChatContext } from '~/utils/context';
import { logReply } from '~/utils/log';
import {
  checkMessageQuota,
  handleMessageCount,
} from '~/utils/message-rate-limiter';
import type { MessageEventArgs } from '../utils/message';
import { assessRelevance } from '../utils/relevance';
import { generateResponse } from '../utils/respond';

export async function handleRelevance(
  args: MessageEventArgs,
  messageContext: SlackMessageContext,
  ctxId: string,
  channelMode: ResponseMode,
  authorName: string,
  content: string,
  chatContext: ChatContext
): Promise<void> {
  if (
    channelMode === 'ping' ||
    channelMode === 'ping+keyword' ||
    channelMode === 'none'
  ) {
    logger.debug(
      `[${ctxId}] Channel mode '${channelMode}' — skipping relevance`
    );
    return;
  }

  const userId = (args.event as { user?: string }).user;
  if (!isUserAllowed(userId ?? '')) {
    return;
  }
  if (userId && (await isUserBanned(userId))) {
    return;
  }

  const { count: idleCount, hasQuota } = await checkMessageQuota(ctxId);
  if (!hasQuota) {
    logger.debug(
      `[${ctxId}] Quota exhausted (${idleCount}/${messageThreshold})`
    );
    return;
  }

  const { probability, reason } = await assessRelevance(
    messageContext,
    chatContext.messages,
    chatContext.hints,
    chatContext.memories
  );
  logger.info(
    { reason, probability, message: `${authorName}: ${content}` },
    `[${ctxId}] Relevance check`
  );

  const willReply = probability > 0.5;
  await handleMessageCount(ctxId, willReply);

  if (!willReply) {
    logger.debug(`[${ctxId}] Low relevance — ignoring`);
    return;
  }

  logger.info(`[${ctxId}] Replying (relevance: ${probability.toFixed(2)})`);
  const result = await generateResponse(
    messageContext,
    chatContext.messages,
    chatContext.hints,
    chatContext.memories
  );
  logReply(ctxId, authorName, result, 'relevance');
  if (result.success && result.toolCalls) {
    await saveChatMemory(messageContext, 5);
  }
}
