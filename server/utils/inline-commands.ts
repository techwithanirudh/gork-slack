import { leaveChannelBlocklist } from '~/config';
import { setSilenced } from '~/lib/kv';
import logger from '~/lib/logger';
import { clearQueue } from '~/lib/queue';
import type { SlackMessageContext } from '~/types';

const INLINE_COMMAND_PATTERN = /^!(stop|leave)\b/i;

async function handleStop(
  context: SlackMessageContext,
  ctxId: string
): Promise<void> {
  await setSilenced(ctxId);
  clearQueue(ctxId);
  logger.info({ ctxId }, 'Thread silenced and queue cleared via !stop');
  await context.client.chat.postMessage({
    channel: context.event.channel,
    thread_ts: (context.event as { thread_ts?: string }).thread_ts,
    text: "aight, i'll shut up now. ping me if u wanna talk",
  });
}

async function handleLeave(context: SlackMessageContext): Promise<void> {
  const channelId = context.event.channel;
  if (leaveChannelBlocklist.some((c) => c.id === channelId)) {
    return;
  }
  await context.client.chat
    .postMessage({ channel: channelId, text: 'leaving now, later' })
    .catch((error) =>
      logger.warn({ error, channelId }, 'Failed to send leave message')
    );
  await context.client.conversations
    .leave({ channel: channelId })
    .catch((error) =>
      logger.error({ error, channelId }, 'Failed to leave channel')
    );
  logger.info({ channelId }, 'Left channel via !leave');
}

export async function handleInlineCommand(
  context: SlackMessageContext,
  ctxId: string,
  text: string
): Promise<'handled' | 'not-handled'> {
  const match = INLINE_COMMAND_PATTERN.exec(text);
  if (!match) {
    return 'not-handled';
  }

  if (match[1]?.toLowerCase() === 'stop') {
    await handleStop(context, ctxId);
  } else {
    await handleLeave(context);
  }

  return 'handled';
}
