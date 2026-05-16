import { messageThreshold } from '~/config';
import { isUserAllowed } from '~/lib/allowed-users';
import type { ResponseMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { saveChatMemory } from '~/lib/memory';
import { isUserBanned } from '~/lib/reports';
import type { SlackMessageContext } from '~/types';
import { buildChatContext } from '~/utils/context';
import { logReply } from '~/utils/log';
import {
  checkMessageQuota,
  handleMessageCount,
} from '~/utils/message-rate-limiter';
import { getAuthorName, getContextId } from '../utils/message';
import { assessRelevance } from '../utils/relevance';
import { generateResponse } from '../utils/respond';

interface RelevanceArgs {
  channelMode: ResponseMode;
  messageContext: SlackMessageContext;
}

export async function handleRelevance({
  messageContext,
  channelMode,
}: RelevanceArgs): Promise<void> {
  if (
    channelMode === 'ping' ||
    channelMode === 'ping+keyword' ||
    channelMode === 'none'
  ) {
    logger.debug(
      `[${getContextId(messageContext)}] Channel mode '${channelMode}' — skipping relevance`
    );
    return;
  }

  const userId = (messageContext.event as { user?: string }).user;
  if (!isUserAllowed(userId ?? '')) {
    return;
  }
  if (userId && (await isUserBanned(userId))) {
    return;
  }

  const ctxId = getContextId(messageContext);
  const { count: idleCount, hasQuota } = await checkMessageQuota(ctxId);
  if (!hasQuota) {
    logger.debug(
      `[${ctxId}] Quota exhausted (${idleCount}/${messageThreshold})`
    );
    return;
  }

  const [authorName, chatContext] = await Promise.all([
    getAuthorName(messageContext),
    buildChatContext(messageContext),
  ]);
  const content = (messageContext.event as { text?: string }).text ?? '';

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
