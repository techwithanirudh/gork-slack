import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { env } from '~/env';
import logger from '~/lib/logger';

export const name = 'member_left_channel';

type MemberLeftChannelEventArgs =
  SlackEventMiddlewareArgs<'member_left_channel'> & AllMiddlewareArgs;

export async function execute({
  event,
  context,
  client,
}: MemberLeftChannelEventArgs) {
  if (event.user !== context.botUserId) {
    return;
  }

  const channelId = event.channel;

  logger.info({ channelId }, 'Bot removed from channel');

  if (!env.BOT_JOIN_LOGS_CHANNEL) {
    logger.warn(
      { channelId },
      'Bot removed from channel notification not sent because BOT_JOIN_LOGS_CHANNEL is not configured'
    );
    return;
  }

  try {
    await client.chat.postMessage({
      channel: env.BOT_JOIN_LOGS_CHANNEL,
      text: `Bot was removed from <#${channelId}>`,
    });
    logger.info(
      { channelId },
      'Bot removed from channel notification sent to reports channel'
    );
  } catch (error) {
    logger.error(
      { error, channelId },
      'Failed to send bot removed from channel notification'
    );
  }
}
