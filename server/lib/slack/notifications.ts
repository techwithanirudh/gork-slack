import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import logger from '~/lib/logger';
import {
  banNotificationBlocks,
  reportNotificationBlocks,
  unbanNotificationBlocks,
} from './blocks';

interface ReportNotificationParams {
  client: WebClient;
  userId: string;
  channelId: string;
  messageTs: string;
  reason: string;
  reportCount: number;
  isBanned: boolean;
  /** Last few messages from the reported user for context */
  messageContext?: string[];
}

export async function sendReportNotification({
  client,
  userId,
  channelId,
  messageTs,
  reason,
  reportCount,
  isBanned,
  messageContext,
}: ReportNotificationParams): Promise<void> {
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Report notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }

  // Check if channel is private (moderators may not have access)
  let isPrivateChannel = false;
  try {
    const channelInfo = await client.conversations.info({ channel: channelId });
    isPrivateChannel =
      channelInfo.channel?.is_private ??
      channelInfo.channel?.is_group ??
      channelInfo.channel?.is_mpim ??
      false;
  } catch {
    // If we can't get channel info, assume it might be private
    isPrivateChannel = true;
  }

  // Get permalink with error handling (may fail for private channels)
  let permalink: string | undefined;
  try {
    const permalinkResult = await client.chat.getPermalink({
      channel: channelId,
      message_ts: messageTs,
    });
    permalink = permalinkResult.permalink ?? undefined;
  } catch (error) {
    logger.warn(
      { error, channelId, messageTs },
      'Failed to get permalink for reported message'
    );
  }

  const blocks = reportNotificationBlocks(
    userId,
    channelId,
    reason,
    reportCount,
    isBanned,
    permalink,
    messageContext,
    isPrivateChannel
  );

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been reported`,
    blocks,
  });

  logger.info(
    { userId, channelId, reportCount, isBanned },
    'Report notification sent to reports channel'
  );
}

interface BanNotificationParams {
  client: WebClient;
  userId: string;
  bannedBy: string;
}

export async function sendBanNotification({
  client,
  userId,
  bannedBy,
}: BanNotificationParams): Promise<void> {
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Ban notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }

  const blocks = banNotificationBlocks(userId, bannedBy);

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been banned`,
    blocks,
  });

  logger.info({ userId, bannedBy }, 'Ban notification sent to reports channel');
}

interface UnbanNotificationParams {
  client: WebClient;
  userId: string;
  unbannedBy: string;
}

export async function sendUnbanNotification({
  client,
  userId,
  unbannedBy,
}: UnbanNotificationParams): Promise<void> {
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Unban notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }

  const blocks = unbanNotificationBlocks(userId, unbannedBy);

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been unbanned`,
    blocks,
  });

  logger.info(
    { userId, unbannedBy },
    'Unban notification sent to reports channel'
  );
}
