import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import { MODES, type ModeScope, type ResponseMode } from '~/lib/kv';
import logger from '~/lib/logger';
import {
  banNotificationBlocks,
  reportNotificationBlocks,
  unbanNotificationBlocks,
} from '../blocks';

interface ReportNotificationParams {
  channelId: string;
  client: WebClient;
  isBanned: boolean;
  /** Last few messages from the reported user for context */
  messageContext?: string[];
  messageTs: string;
  reason: string;
  reportCount: number;
  userId: string;
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

  let isPrivateChannel = false;
  try {
    const channelInfo = await client.conversations.info({ channel: channelId });
    isPrivateChannel =
      channelInfo.channel?.is_private ??
      channelInfo.channel?.is_group ??
      channelInfo.channel?.is_mpim ??
      false;
  } catch {
    isPrivateChannel = true;
  }

  let permalink: string | undefined;
  try {
    const result = await client.chat.getPermalink({
      channel: channelId,
      message_ts: messageTs,
    });
    permalink = result.permalink ?? undefined;
  } catch (error) {
    logger.warn(
      { error, channelId, messageTs },
      'Failed to get permalink for reported message'
    );
  }

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been reported`,
    blocks: reportNotificationBlocks(
      userId,
      channelId,
      reason,
      reportCount,
      isBanned,
      permalink,
      messageContext,
      isPrivateChannel
    ),
  });

  logger.info(
    { userId, channelId, reportCount, isBanned },
    'Report notification sent'
  );
}

interface BanNotificationParams {
  bannedBy: string;
  client: WebClient;
  userId: string;
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

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been banned`,
    blocks: banNotificationBlocks(userId, bannedBy),
  });

  logger.info({ userId, bannedBy }, 'Ban notification sent');
}

interface UnbanNotificationParams {
  client: WebClient;
  unbannedBy: string;
  userId: string;
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

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been unbanned`,
    blocks: unbanNotificationBlocks(userId, unbannedBy),
  });

  logger.info({ userId, unbannedBy }, 'Unban notification sent');
}

interface ModeChangeNotificationParams {
  action: 'clear' | 'set';
  changedBy: string;
  channelId: string;
  client: WebClient;
  mode?: ResponseMode;
  scope: ModeScope;
  workspaceId: string;
}

export async function sendModeChangeNotification({
  action,
  channelId,
  changedBy,
  client,
  mode,
  scope,
  workspaceId,
}: ModeChangeNotificationParams): Promise<void> {
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Mode change notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }

  const target =
    scope === 'workspace' ? `workspace ${workspaceId}` : `<#${channelId}>`;
  const description =
    action === 'set'
      ? `Reply mode was set to *${mode ? MODES[mode] : 'unknown'}*.`
      : 'Reply mode was cleared.';

  try {
    await client.chat.postMessage({
      channel: env.REPORTS_CHANNEL,
      text: `Gork ${scope} mode ${action} by <@${changedBy}>`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: action === 'set' ? 'Mode Set' : 'Mode Cleared',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: description,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Changed By*\n<@${changedBy}>` },
            { type: 'mrkdwn', text: `*Scope*\n${scope}` },
            { type: 'mrkdwn', text: `*Target*\n${target}` },
          ],
        },
      ],
    });
    logger.info(
      { action, scope, channelId, workspaceId, mode, changedBy },
      'Mode change notification sent'
    );
  } catch (error) {
    logger.warn(
      { error, action, scope, channelId, workspaceId, mode, changedBy },
      'Failed to send mode change notification'
    );
  }
}
