import { blockedChannels, keywords } from '~/config';
import {
  clearSilenced,
  getEffectiveMode,
  isSilenced,
  keys,
  ratelimit,
} from '~/lib/kv';
import logger from '~/lib/logger';
import { getQueue } from '~/lib/queue';
import { handleInlineCommand } from '~/utils/inline-commands';
import { getTrigger, type Trigger } from '~/utils/triggers';
import { handleRelevance } from './handlers/relevance';
import { handleTriggered } from './handlers/triggered';
import {
  getContextId,
  isProcessableMessage,
  type MessageEventArgs,
} from './utils/message';

export const name = 'message';

async function handleMessage(
  args: MessageEventArgs,
  trigger: Trigger
): Promise<void> {
  const messageContext = isProcessableMessage(args);
  if (!messageContext) {
    return;
  }

  const { event } = messageContext;

  if (event.text?.startsWith('##')) {
    return;
  }

  const ctxId = getContextId(messageContext);

  if (blockedChannels.some((c) => c.id === event.channel)) {
    if (trigger.type === 'ping' || trigger.type === 'dm') {
      await args.client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts ?? event.ts,
        text: "can't talk here, find me in another channel",
      });
    }
    return;
  }

  const silenced = await isSilenced(ctxId);
  if (silenced) {
    if (trigger.type === 'ping') {
      await clearSilenced(ctxId);
      logger.info(`[${ctxId}] Thread un-silenced by ping`);
    } else {
      logger.debug(`[${ctxId}] Thread is silenced: skipping`);
      return;
    }
  }

  const channelMode = await getEffectiveMode({
    workspaceId: messageContext.teamId,
    channelId: event.channel,
  });

  if (trigger.type != null) {
    await handleTriggered({
      messageContext,
      channelMode,
      triggerType: trigger.type,
    });
    return;
  }

  await handleRelevance({ messageContext, channelMode });
}

export async function execute(args: MessageEventArgs) {
  if (
    args.event.subtype &&
    args.event.subtype !== 'thread_broadcast' &&
    args.event.subtype !== 'file_share'
  ) {
    return;
  }

  const messageContext = isProcessableMessage(args);
  if (!messageContext) {
    return;
  }

  const ctxId = getContextId(messageContext);
  const { success } = await ratelimit(keys.channelCount(ctxId));
  if (!success) {
    logger.info(`[${ctxId}] Rate limit hit. Skipping reply.`);
    return;
  }

  const trigger = await getTrigger(
    messageContext,
    keywords,
    messageContext.botUserId
  );

  if (trigger.type === 'ping') {
    const raw = messageContext.event.text ?? '';
    const text = raw.replace(/<@[A-Z0-9]+>/gi, '').trimStart();
    const inlineResult = await handleInlineCommand(messageContext, ctxId, text);
    if (inlineResult === 'handled') {
      return;
    }
  }

  return await getQueue(ctxId).add(async () => handleMessage(args, trigger));
}
