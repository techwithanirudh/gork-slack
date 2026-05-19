import { messageThreshold } from '~/config';
import { isUserAllowed } from '~/lib/allowed-users';
import type { ResponseMode } from '~/lib/kv';
import { isUserBanned } from '~/lib/kv';
import logger from '~/lib/logger';
import { saveChatMemory } from '~/lib/memory';
import type { SlackMessageContext } from '~/types';
import { buildChatContext } from '~/utils/context';
import { logReply } from '~/utils/log';
import {
  checkMessageQuota,
  handleMessageCount,
} from '~/utils/message-rate-limiter';
import { getAuthorName, getContextId, setThreadStatus } from '../utils/message';
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
    channelMode === 'keyword' ||
    channelMode === 'none'
  ) {
    logger.debug(
      `[${getContextId(messageContext)}] Channel mode '${channelMode}': skipping relevance`
    );
    return;
  }

  const { user: userId } = messageContext.event;
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
  ]).catch((error) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'data' in error &&
      (error as { data?: { error?: string } }).data?.error === 'not_in_channel'
    ) {
      logger.info(`[${ctxId}] Bot is not in channel, skipping relevance`);
      return [null, null] as const;
    }
    throw error;
  });

  if (!(authorName && chatContext)) {
    return;
  }

  const { probability, reason } = await assessRelevance(
    messageContext,
    chatContext.messages,
    chatContext.hints,
    chatContext.memories
  );

  const { text: content = '' } = messageContext.event;
  logger.info(
    { reason, probability, message: `${authorName}: ${content}` },
    `[${ctxId}] Relevance check`
  );

  const willReply = probability > 0.5;
  await handleMessageCount(ctxId, willReply);

  if (!willReply) {
    logger.debug(`[${ctxId}] Low relevance: ignoring`);
    return;
  }

  logger.info(`[${ctxId}] Replying (relevance: ${probability.toFixed(2)})`);
  setThreadStatus({ ctx: messageContext, active: true });
  try {
    const result = await generateResponse(
      messageContext,
      chatContext.messages,
      chatContext.hints,
      chatContext.memories
    );
    logReply({ ctxId, author: authorName, result, reason: 'relevance' });
    if (result.success && result.toolCalls) {
      await saveChatMemory(messageContext, {
        channelName: chatContext.hints.channel,
        guildName: chatContext.hints.server,
      });
    }
  } finally {
    setThreadStatus({ ctx: messageContext, active: false });
  }
}
