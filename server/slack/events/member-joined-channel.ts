import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { channelMode as channelModeConfig } from '~/config';
import { mode as modeHelp } from '~/constants/help';
import { env } from '~/env';
import { setMode } from '~/lib/kv';
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

  let members = 0;
  try {
    const { largeChannelThreshold } = channelModeConfig;
    let cursor: string | undefined;
    do {
      const res = await client.conversations.members({
        channel: channelId,
        limit: largeChannelThreshold,
        cursor,
      });
      members += res.members?.length ?? 0;
      cursor =
        members < largeChannelThreshold
          ? (res.response_metadata?.next_cursor ?? undefined)
          : undefined;
    } while (cursor);
  } catch (error) {
    logger.warn({ error, channelId }, 'Failed to count channel members');
  }

  const isLarge = members >= channelModeConfig.largeChannelThreshold;
  const assignedMode = isLarge ? 'ping' : 'relevance';

  if (isLarge) {
    try {
      await setMode({ scope: 'channel', id: channelId, mode: 'ping' });
      logger.info(
        { channelId, members },
        'Auto-set channel mode to ping on bot join'
      );
    } catch (error) {
      logger.error({ error, channelId }, 'Failed to auto-set channel mode');
    }
  }

  const modeList = (modeHelp.modes ?? [])
    .map((m) => `• *${m.name}*: ${m.description}`)
    .join('\n');

  const modeLabel = isLarge ? 'ping only' : 'relevance';
  const reason = isLarge
    ? '(large channel, defaults to ping only)'
    : '(smaller channel, defaults to relevance)';

  try {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `Gork is now in *${modeLabel}* mode in this channel ${reason}.\n\nTo change it: \`/gork mode set channel <mode>\`\n\nAvailable modes:\n${modeList}`,
    });
  } catch (error) {
    logger.warn(
      { error, userId, channelId },
      'Failed to send ephemeral mode notice'
    );
  }

  if (!env.LOGS_CHANNEL) {
    logger.warn(
      { userId, channelId },
      'Bot added to channel notification not sent because LOGS_CHANNEL is not configured'
    );
    return;
  }

  try {
    await client.chat.postMessage({
      channel: env.LOGS_CHANNEL,
      text: `<@${userId}> added the bot to <#${channelId}> (mode auto-set to ${assignedMode}, ${members} members)`,
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
