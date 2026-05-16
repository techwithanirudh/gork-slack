import { env } from '~/env';
import { isUserAllowed } from '~/lib/allowed-users';
import type { ResponseMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { saveChatMemory } from '~/lib/memory';
import { isUserBanned } from '~/lib/reports';
import type { SlackMessageContext } from '~/types';
import type { ChatContext } from '~/utils/context';
import { logReply } from '~/utils/log';
import { resetMessageCount } from '~/utils/message-rate-limiter';
import type { MessageEventArgs } from '../utils/message';
import { generateResponse } from '../utils/respond';

export async function handleTriggered(
  args: MessageEventArgs,
  messageContext: SlackMessageContext,
  ctxId: string,
  triggerType: string,
  channelMode: ResponseMode,
  authorName: string,
  content: string,
  chatContext: ChatContext
): Promise<void> {
  if (
    channelMode === 'none' &&
    triggerType !== 'ping' &&
    triggerType !== 'dm'
  ) {
    logger.debug(
      `[${ctxId}] Channel mode 'none' — skipping trigger ${triggerType}`
    );
    return;
  }
  if (channelMode === 'ping' && triggerType === 'keyword') {
    logger.debug(`[${ctxId}] Channel mode 'ping' — skipping keyword trigger`);
    return;
  }

  const ev = args.event as {
    user?: string;
    channel: string;
    thread_ts?: string;
    ts?: string;
  };

  if (!isUserAllowed(ev.user ?? '')) {
    if (triggerType === 'keyword') {
      return;
    }
    await args.client.chat.postMessage({
      channel: ev.channel,
      thread_ts: ev.thread_ts || ev.ts,
      text: `sorry bro <@${ev.user}> you gotta be in <#${env.OPT_IN_CHANNEL}> to talk to me alr? i'm exclusive yk`,
    });
    return;
  }

  const userId = ev.user;
  if (userId && (await isUserBanned(userId))) {
    if (triggerType === 'ping' || triggerType === 'dm') {
      await args.client.chat.postMessage({
        channel: ev.channel,
        text: "nah bro you're banned lol. hit up staff if you think this is a mistake or whatever",
        thread_ts: ev.thread_ts || ev.ts,
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
      await args.client.conversations.invite({
        channel: env.AUTO_ADD_CHANNEL,
        users: userId,
      });
      logger.info(`Added ${userId} to channel ${env.AUTO_ADD_CHANNEL}`);
    } catch (error) {
      logger.error({ error }, 'Failed to add user to channel');
    }
  }

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
