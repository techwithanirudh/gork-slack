import { restrictedChannels } from '~/config';
import { setSilenced } from '~/lib/kv';
import logger from '~/lib/logger';
import { clearQueue } from '~/lib/queue';
import type { SlackMessageContext } from '~/types';

const INLINE_COMMAND_RE = /^!(\w+)/i;

async function handleStop(
  context: SlackMessageContext,
  ctxId: string
): Promise<void> {
  const threadTs = (context.event as { thread_ts?: string }).thread_ts;
  if (!threadTs) {
    return;
  }
  await setSilenced(ctxId);
  clearQueue(ctxId);
  logger.info({ ctxId }, 'Thread silenced and queue cleared via !stop');
  await context.client.chat
    .postMessage({
      channel: context.event.channel,
      thread_ts: threadTs,
      text: "aight, i'll shut up now. ping me if u wanna talk",
    })
    .catch((error) =>
      logger.warn({ error, ctxId }, 'Failed to send stop message')
    );
}

async function handleLeave(context: SlackMessageContext): Promise<void> {
  const channelId = context.event.channel;
  if (restrictedChannels.some((c) => c.id === channelId)) {
    return;
  }
  await context.client.chat
    .postMessage({ channel: channelId, text: 'leaving now, later' })
    .catch((error) =>
      logger.warn({ error, channelId }, 'Failed to send leave message')
    );
  const left = await context.client.conversations
    .leave({ channel: channelId })
    .then(() => true)
    .catch((error) => {
      logger.error({ error, channelId }, 'Failed to leave channel');
      return false;
    });
  if (left) {
    logger.info({ channelId }, 'Left channel via !leave');
  }
}

export async function handleInlineCommand(
  context: SlackMessageContext,
  ctxId: string,
  text: string
): Promise<'handled' | 'not-handled'> {
  const command = INLINE_COMMAND_RE.exec(text)?.[1]?.toLowerCase();
  if (!command) {
    return 'not-handled';
  }

  switch (command) {
    case 'stop':
      await handleStop(context, ctxId);
      return 'handled';
    case 'leave':
      await handleLeave(context);
      return 'handled';
    default:
      return 'not-handled';
  }
}
