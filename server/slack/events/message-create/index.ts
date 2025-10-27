import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { keywords, messageThreshold } from '~/config';
import { env } from '~/env';
import { isUserAllowed } from '~/lib/allowed-users';
import { ratelimit, redisKeys } from '~/lib/kv';
import logger from '~/lib/logger';
import { saveChatMemory } from '~/lib/memory';
import type { SlackMessageContext } from '~/types';
import { buildChatContext } from '~/utils/context';
import { logReply } from '~/utils/log';
import {
  checkMessageQuota,
  handleMessageCount,
  resetMessageCount,
} from '~/utils/message-rate-limiter';
import { getTrigger } from '~/utils/triggers';
import { assessRelevance } from './utils/relevance';
import { generateResponse } from './utils/respond';

export const name = 'message';

type MessageEventArgs = SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs;

async function canReply(ctxId: string): Promise<boolean> {
  const { success } = await ratelimit(redisKeys.channelCount(ctxId));
  if (!success) {
    logger.info(`[${ctxId}] Rate limit hit. Skipping reply.`);
  }
  return success;
}

async function onSuccess(context: SlackMessageContext) {
  await saveChatMemory(context, 5);
}

async function isProcessableMessage(
  args: MessageEventArgs,
): Promise<SlackMessageContext | null> {
  const { event, context, client, body } = args;

  if (
    event.subtype &&
    event.subtype !== 'thread_broadcast' &&
    event.subtype !== 'file_share'
  )
    return null;

  if ('bot_id' in event && event.bot_id) return null;

  if (context.botUserId && event.user === context.botUserId) {
    return null;
  }

  if (!('text' in event)) return null;

  if (!isUserAllowed(event.user)) {
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      markdown_text: `sorry bro <@${event.user}> you gotta be in ${env.OPT_IN_CHANNEL} to talk to me alr? i'm exclusive yk`,
    });
    return null;
  }

  return {
    event: event as SlackMessageContext['event'],
    client,
    botUserId: context.botUserId,
    teamId:
      context.teamId ??
      (typeof body === 'object' && body
        ? (body as { team_id?: string }).team_id
        : undefined),
  } satisfies SlackMessageContext;
}

async function getAuthorName(ctx: SlackMessageContext): Promise<string> {
  const userId = (ctx.event as { user?: string }).user;
  if (!userId) return 'unknown';
  try {
    const info = await ctx.client.users.info({ user: userId });
    return (
      info.user?.profile?.display_name ||
      info.user?.real_name ||
      info.user?.name ||
      userId
    );
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to fetch user info for logging');
    return userId;
  }
}

function getContextId(ctx: SlackMessageContext): string {
  const channel = (ctx.event as { channel?: string }).channel;
  const userId = (ctx.event as { user?: string }).user;
  const channelType = (ctx.event as { channel_type?: string }).channel_type;
  if (channelType === 'im' && userId) {
    return `dm:${userId}`;
  }
  return channel ?? 'unknown-channel';
}

export async function execute(args: MessageEventArgs) {
  const messageContext = await isProcessableMessage(args);
  if (!messageContext) return;

  const ctxId = getContextId(messageContext);
  if (!(await canReply(ctxId))) return;

  const trigger = await getTrigger(
    messageContext,
    keywords,
    messageContext.botUserId,
  );

  const authorName = await getAuthorName(messageContext);
  const content = (messageContext.event as { text?: string }).text ?? '';

  const { messages, hints, memories } = await buildChatContext(messageContext);

  if (trigger.type) {
    if (
      (trigger.type === 'ping' || trigger.type === 'dm') &&
      env.AUTO_ADD_CHANNEL &&
      args.context.userId
    ) {
      try {
        await args.client.conversations.invite({
          channel: env.AUTO_ADD_CHANNEL,
          users: args.context.userId,
        });
        logger.info(
          `Added ${args.context.userId} to channel ${env.AUTO_ADD_CHANNEL}`,
        );
      } catch {}
    }

    await resetMessageCount(ctxId);

    logger.info(
      {
        message: `${authorName}: ${content}`,
      },
      `[${ctxId}] Triggered by ${trigger.type}`,
    );

    const result = await generateResponse(
      messageContext,
      messages,
      hints,
      memories,
    );

    logReply(ctxId, authorName, result, 'trigger');

    if (result.success && result.toolCalls) {
      await onSuccess(messageContext);
    }
    return;
  }

  const { count: idleCount, hasQuota } = await checkMessageQuota(ctxId);

  if (!hasQuota) {
    logger.debug(
      `[${ctxId}] Quota exhausted (${idleCount}/${messageThreshold})`,
    );
    return;
  }

  const { probability, reason } = await assessRelevance(
    messageContext,
    messages,
    hints,
    memories,
  );
  logger.info(
    { reason, probability, message: `${authorName}: ${content}` },
    `[${ctxId}] Relevance check`,
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
    messages,
    hints,
    memories,
  );
  logReply(ctxId, authorName, result, 'relevance');
  if (result.success && result.toolCalls) {
    await onSuccess(messageContext);
  }
}
