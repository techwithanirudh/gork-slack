import { env } from '~/env';
import { isUserAllowed } from '~/lib/allowed-users';
import type { ResponseMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { saveChatMemory } from '~/lib/memory';
import { isUserBanned } from '~/lib/reports';
import type { SlackMessageContext } from '~/types';
import { buildChatContext } from '~/utils/context';
import { logReply } from '~/utils/log';
import { resetMessageCount } from '~/utils/message-rate-limiter';
import type { TriggerType } from '~/utils/triggers';
import { getAuthorName, getContextId } from '../utils/message';
import { generateResponse } from '../utils/respond';

interface TriggeredArgs {
  channelMode: ResponseMode;
  messageContext: SlackMessageContext;
  triggerType: NonNullable<TriggerType>;
}

export async function handleTriggered({
  messageContext,
  triggerType,
  channelMode,
}: TriggeredArgs): Promise<void> {
  if (channelMode === 'none' && triggerType !== 'dm') {
    logger.debug(
      `[${getContextId(messageContext)}] Channel mode 'none' — skipping trigger ${triggerType}`
    );
    return;
  }
  if (channelMode === 'ping' && triggerType === 'keyword') {
    logger.debug(
      `[${getContextId(messageContext)}] Channel mode 'ping' — skipping keyword trigger`
    );
    return;
  }

  const ev = messageContext.event;
  const userId = (ev as { user?: string }).user;
  const threadTs = (ev as { thread_ts?: string }).thread_ts;

  if (!isUserAllowed(userId ?? '')) {
    if (triggerType === 'keyword') {
      return;
    }
    await messageContext.client.chat.postMessage({
      channel: ev.channel,
      thread_ts: threadTs || ev.ts,
      text: `sorry bro <@${userId}> you gotta be in <#${env.OPT_IN_CHANNEL}> to talk to me alr? i'm exclusive yk`,
    });
    return;
  }

  if (userId && (await isUserBanned(userId))) {
    if (triggerType === 'ping' || triggerType === 'dm') {
      await messageContext.client.chat.postMessage({
        channel: ev.channel,
        text: "nah bro you're banned lol. hit up staff if you think this is a mistake or whatever",
        thread_ts: threadTs || ev.ts,
      });
    }
    logger.info({ userId }, 'Refused to respond to banned user');
    return;
  }

  if (
    (triggerType === 'ping' || triggerType === 'dm') &&
    env.AUTO_ADD_CHANNEL &&
    userId
  ) {
    try {
      await messageContext.client.conversations.invite({
        channel: env.AUTO_ADD_CHANNEL,
        users: userId,
      });
      logger.info(`Added ${userId} to channel ${env.AUTO_ADD_CHANNEL}`);
    } catch (error) {
      const code = (error as { data?: { error?: string }; code?: string }).data
        ?.error;
      const errorCode =
        code ?? (error as { data?: { error?: string }; code?: string }).code;
      if (
        errorCode === 'already_in_channel' ||
        errorCode === 'cant_invite_self'
      ) {
        logger.debug(
          { error, userId },
          'User already in channel or cannot be invited'
        );
      } else {
        logger.error({ error, userId }, 'Failed to add user to channel');
      }
    }
  }

  const ctxId = getContextId(messageContext);
  const content = (ev as { text?: string }).text ?? '';
  const [authorName, chatContext] = await Promise.all([
    getAuthorName(messageContext),
    buildChatContext(messageContext),
  ]);

  await resetMessageCount(ctxId);
  logger.info(
    { message: `${authorName}: ${content}` },
    `[${ctxId}] Triggered by ${triggerType}`
  );

  const result = await generateResponse(
    messageContext,
    chatContext.messages,
    chatContext.hints,
    chatContext.memories
  );
  logReply(ctxId, authorName, result, 'trigger');
  if (result.success && result.toolCalls) {
    await saveChatMemory(messageContext, 5);
  }
}
