import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { env } from '~/env';
import logger from '~/lib/logger';

export const name = 'member_joined_channel';

type MemberJoinedChannelEventArgs =
  SlackEventMiddlewareArgs<'member_joined_channel'> & AllMiddlewareArgs;

export async function execute({
  event,
  context,
  client,
}: MemberJoinedChannelEventArgs) {
  if (event.user !== context.botUserId || !event.inviter) {
    return;
  }

  const userId = event.inviter;
  const channelId = event.channel;

  logger.info({ userId, channelId }, 'Bot added to channel');

  if (!env.BOT_JOIN_LOGS_CHANNEL) {
    logger.warn(
      { userId, channelId },
      'Bot added to channel notification not sent because BOT_JOIN_LOGS_CHANNEL is not configured'
    );
    return;
  }

  try {
    await client.chat.postMessage({
      channel: env.BOT_JOIN_LOGS_CHANNEL,
      text: `<@${userId}> added the bot to <#${channelId}>`,
    });
    logger.info(
      { userId, channelId },
      'Bot added to channel notification sent to reports channel'
    );
  } catch (error) {
    logger.error(
      { error, userId, channelId },
      'Failed to send bot added to channel notification'
    );
  }
}
