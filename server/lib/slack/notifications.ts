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
}

export async function sendReportNotification({
  client,
  userId,
  channelId,
  messageTs,
  reason,
  reportCount,
  isBanned,
}: ReportNotificationParams): Promise<void> {
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Report notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }

  const permalinkResult = await client.chat.getPermalink({
    channel: channelId,
    message_ts: messageTs,
  });

  const blocks = reportNotificationBlocks(
    userId,
    channelId,
    reason,
    reportCount,
    isBanned,
    permalinkResult.permalink ?? undefined
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
