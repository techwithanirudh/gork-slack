import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { setSilenced } from '~/lib/kv';
import logger from '~/lib/logger';

export const name = 'stop';

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, client, respond } = context;

  await ack();

  const channelId = body.channel_id;
  const threadTs = body.thread_ts as string | undefined;
  const userId = body.user_id;

  const ctxId = threadTs ? `${channelId}:${threadTs}` : channelId;

  await setSilenced(ctxId);

  logger.info({ ctxId, userId }, 'Thread/channel silenced via stop command');

  const scope = threadTs ? 'this thread' : 'this channel';

  await respond({
    text: `gork has been silenced in ${scope}. Use \`/gork stop\` again or ping gork directly to un-silence.`,
    response_type: 'ephemeral',
  });

  try {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: "aight, i'll shut up now. ping me if u wanna talk",
    });
  } catch (error) {
    logger.warn({ error, ctxId }, 'Failed to send stop acknowledgment message');
  }
}
