import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { leaveChannelBlocklist } from '~/config';
import { env } from '~/env';
import logger from '~/lib/logger';

export const name = 'leave';

const SLACK_USER_ID_REGEX = /^[UW][A-Z0-9]+$/;

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, client, respond } = context;

  await ack();

  const channelId = body.channel_id;
  const userId = body.user_id;

  const blocked = leaveChannelBlocklist.find((c) => c.id === channelId);
  if (blocked) {
    await respond({
      text: `cannot leave #${blocked.name} — this channel is protected.`,
      response_type: 'ephemeral',
    });
    return;
  }

  const safeUserId =
    userId && SLACK_USER_ID_REGEX.test(userId) ? userId : undefined;

  if (env.LOGS_CHANNEL) {
    try {
      await client.chat.postMessage({
        channel: env.LOGS_CHANNEL,
        text: safeUserId
          ? `<@${safeUserId}> asked the bot to leave <#${channelId}> via /gork leave`
          : `The bot was asked to leave <#${channelId}> via /gork leave`,
      });
    } catch (error) {
      logger.error({ error, channelId, userId }, 'Failed to send leave-channel log');
    }
  }

  try {
    await client.chat.postMessage({
      channel: channelId,
      text: "aight, i'm out. ping me in another channel if u need me",
    });
  } catch (error) {
    logger.warn({ error, channelId }, 'Failed to send leave acknowledgment');
  }

  try {
    await client.conversations.leave({ channel: channelId });
    logger.info({ channelId, userId }, 'Left channel via /gork leave');
  } catch (error) {
    logger.error({ error, channelId }, 'Failed to leave channel');
    await respond({
      text: "couldn't leave the channel — i might not be in it or something went wrong.",
      response_type: 'ephemeral',
    });
  }
}
