import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { env } from '~/env';
import logger from '~/lib/logger';
import { help as modeHelp } from '~/slack/features/mode/commands';
import { countChannelMembers, resolveMode } from './utils/mode';

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

  let memberCount = 0;
  try {
    memberCount = await countChannelMembers(client, channelId);
  } catch (error) {
    logger.warn({ error, channelId }, 'Failed to count channel members');
  }

  const {
    mode: assignedMode,
    label: modeLabel,
    reason,
  } = await resolveMode(channelId, memberCount);

  const modeList = (modeHelp.modes ?? [])
    .map((m) => `• *${m.name}*: ${m.description}`)
    .join('\n');

  try {
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `ok i'm here. this channel is on *${modeLabel}* mode ${reason}.\n\nchange it with \`/gork mode set channel <mode>\` if you must\n\navailable modes:\n${modeList}`,
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
      text: `<@${userId}> added the bot to <#${channelId}> (mode: ${assignedMode}, ${memberCount} members)`,
    });
    logger.info(
      { userId, channelId },
      'Bot added to channel notification sent'
    );
  } catch (error) {
    logger.error(
      { error, userId, channelId },
      'Failed to send bot added to channel notification'
    );
  }
}
