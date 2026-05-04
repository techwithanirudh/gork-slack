import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { leaveChannelBlocklist } from '~/config';
import logger from '~/lib/logger';

export const name = 'leave';

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, client, respond } = context;

  await ack();

  const channelId = body.channel_id;

  const blocked = leaveChannelBlocklist.find((c) => c.id === channelId);
  if (blocked) {
    await respond({
      text: `cannot leave #${blocked.name} — this channel is protected.`,
      response_type: 'ephemeral',
    });
    return;
  }

  await client.chat
    .postMessage({
      channel: channelId,
      text: "aight, i'm out. ping me in another channel if u need me",
    })
    .catch((error) =>
      logger.warn({ error, channelId }, 'Failed to send leave acknowledgment')
    );

  await client.conversations.leave({ channel: channelId }).catch((error) => {
    logger.error({ error, channelId }, 'Failed to leave channel');
    return respond({
      text: "couldn't leave the channel — something went wrong.",
      response_type: 'ephemeral',
    });
  });
}
