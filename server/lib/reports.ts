import type { WebClient } from '@slack/web-api';
import { generateObject } from 'ai';
import { moderation } from '~/config';
import { env } from '~/env';
import { contentFilterPrompt } from '~/lib/ai/prompts/tasks';
import { provider } from '~/lib/ai/providers';
import { contentFilterSchema } from '~/lib/validators';
import { redis, redisKeys } from './kv';
import logger from './logger';

export const REPORTS_CHANNEL = env.REPORTS_CHANNEL ?? 'C0A9ATPB2KF';

const adminUserIds = new Set(
  env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()) ?? []
);

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}

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
  const permalinkResult = await client.chat.getPermalink({
    channel: channelId,
    message_ts: messageTs,
  });
  const messageLink = permalinkResult.permalink;

  const actionElements: object[] = [];

  if (messageLink) {
    actionElements.push({
      type: 'button',
      text: {
        type: 'plain_text',
        text: '📍 View Message',
        emoji: true,
      },
      url: messageLink,
      action_id: 'view_reported_message',
    });
  }

  actionElements.push({
    type: 'button',
    text: {
      type: 'plain_text',
      text: isBanned ? '✅ Unban User' : '🚫 Ban User',
      emoji: true,
    },
    style: isBanned ? 'primary' : 'danger',
    action_id: isBanned ? 'unban_user' : 'ban_user',
    value: userId,
  });

  await client.chat.postMessage({
    channel: REPORTS_CHANNEL,
    text: `User <@${userId}> has been reported`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: isBanned ? '🚫 User Banned' : '⚠️ New Report',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Reported User:*\n<@${userId}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Report Count:*\n${reportCount}`,
          },
          {
            type: 'mrkdwn',
            text: `*Channel:*\n<#${channelId}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${isBanned ? '🚫 Banned' : '⚠️ Warned'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:*\n${reason}`,
        },
      },
      {
        type: 'actions',
        elements: actionElements,
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Report submitted at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
          },
        ],
      },
      // biome-ignore lint/suspicious/noExplicitAny: Slack block types
    ] as any,
  });

  logger.info(
    { userId, channelId, reportCount, isBanned },
    'Report notification sent to reports channel'
  );
}

export async function addReport(
  userId: string,
  reason: string
): Promise<number> {
  const key = redisKeys.userReports(userId);
  const now = Date.now();

  await redis.zadd(key, now, `${now}:${reason}`);
  await redis.zremrangebyscore(
    key,
    0,
    now - moderation.reports.expiration * 1000
  );
  await redis.expire(key, moderation.reports.expiration);

  const count = await redis.zcard(key);

  logger.info({ userId, reason, reportCount: count }, 'Report added for user');

  if (count >= moderation.banThreshold) {
    await redis.set(redisKeys.userBanned(userId), '1');
    logger.warn({ userId, reportCount: count }, 'User has been banned');
  }

  return count;
}

export async function getReportCount(userId: string): Promise<number> {
  const key = redisKeys.userReports(userId);
  await redis.zremrangebyscore(
    key,
    0,
    Date.now() - moderation.reports.expiration * 1000
  );
  return await redis.zcard(key);
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const banned = await redis.get(redisKeys.userBanned(userId));
  if (banned === '1') {
    return true;
  }

  const count = await getReportCount(userId);
  if (count >= moderation.banThreshold) {
    await redis.set(redisKeys.userBanned(userId), '1');
    return true;
  }

  return false;
}

export async function banUser(userId: string): Promise<void> {
  await redis.set(redisKeys.userBanned(userId), '1');
  logger.info({ userId }, 'User manually banned');
}

export async function unbanUser(userId: string): Promise<void> {
  await redis.del(redisKeys.userBanned(userId));
  await redis.del(redisKeys.userReports(userId));
  logger.info({ userId }, 'User unbanned and reports cleared');
}

export interface Report {
  id: string;
  timestamp: number;
  reason: string;
}

export async function getUserReports(userId: string): Promise<Report[]> {
  const key = redisKeys.userReports(userId);
  const now = Date.now();

  await redis.zremrangebyscore(
    key,
    0,
    now - moderation.reports.expiration * 1000
  );

  const reports = await redis.zrange(key, 0, -1);

  return reports.map((report) => {
    const [timestamp = '0', ...reasonParts] = report.split(':');
    return {
      id: report,
      timestamp: Number.parseInt(timestamp, 10),
      reason: reasonParts.join(':'),
    };
  });
}

export async function removeReport(
  userId: string,
  reportId: string
): Promise<boolean> {
  const key = redisKeys.userReports(userId);
  const removed = await redis.zrem(key, reportId);

  if (removed > 0) {
    logger.info({ userId, reportId }, 'Report removed');

    const count = await redis.zcard(key);
    if (count < moderation.banThreshold) {
      const wasBanned = await redis.get(redisKeys.userBanned(userId));
      if (wasBanned === '1') {
        await redis.del(redisKeys.userBanned(userId));
        logger.info({ userId }, 'User auto-unbanned after report removal');
      }
    }

    return true;
  }

  return false;
}

export async function validateReport(
  messageContent: string
): Promise<{ valid: boolean; reason: string }> {
  try {
    const { object } = await generateObject({
      model: provider.languageModel('content-filter-model'),
      schema: contentFilterSchema,
      prompt: contentFilterPrompt([messageContent]),
      temperature: 0.3,
    });

    return {
      valid: !object.safe,
      reason: object.reason,
    };
  } catch (error) {
    logger.error({ error, messageContent }, 'Report validation failed');
    return {
      valid: false,
      reason: 'Validation failed, report not counted',
    };
  }
}
