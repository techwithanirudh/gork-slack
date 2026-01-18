import { moderation } from '~/config';
import { redis, redisKeys } from '~/lib/kv';
import logger from '~/lib/logger';

const UUID_REGEX = /^[a-f0-9-]{36}$/;

export interface Report {
  id: string;
  timestamp: number;
  reason: string;
}

function parseReport(report: string): Report {
  const parts = report.split(':');
  const timestamp = Number.parseInt(parts[0] ?? '0', 10);
  const hasUniqueId = parts[1] && UUID_REGEX.test(parts[1]);
  const reason = hasUniqueId
    ? parts.slice(2).join(':')
    : parts.slice(1).join(':');
  return { id: report, timestamp, reason };
}

async function cleanExpiredReports(key: string): Promise<void> {
  await redis.zremrangebyscore(
    key,
    0,
    Date.now() - moderation.reports.expiration * 1000
  );
}

export async function addReport(
  userId: string,
  reason: string
): Promise<number> {
  const key = redisKeys.userReports(userId);
  const now = Date.now();
  const uniqueId = crypto.randomUUID();

  await redis.zadd(key, now, `${now}:${uniqueId}:${reason}`);
  await cleanExpiredReports(key);
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
  await cleanExpiredReports(key);
  return await redis.zcard(key);
}

export async function getUserReports(userId: string): Promise<Report[]> {
  const key = redisKeys.userReports(userId);
  await cleanExpiredReports(key);
  const reports = await redis.zrange(key, 0, -1);
  return reports.map(parseReport);
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
