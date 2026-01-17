import { generateObject } from 'ai';
import { contentFilterPrompt } from '~/lib/ai/prompts/tasks';
import { provider } from '~/lib/ai/providers';
import { contentFilterSchema } from '~/lib/validators';
import { redis, redisKeys } from './kv';
import logger from './logger';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const BAN_THRESHOLD = 15;

export async function addReport(
  userId: string,
  reason: string
): Promise<number> {
  const key = redisKeys.userReports(userId);
  const now = Date.now();

  await redis.zadd(key, now, `${now}:${reason}`);
  await redis.zremrangebyscore(key, 0, now - THIRTY_DAYS_MS);
  await redis.expire(key, THIRTY_DAYS_SECONDS);

  const count = await redis.zcard(key);

  logger.info({ userId, reason, reportCount: count }, 'Report added for user');

  if (count >= BAN_THRESHOLD) {
    await redis.set(redisKeys.userBanned(userId), '1');
    logger.warn({ userId, reportCount: count }, 'User has been banned');
  }

  return count;
}

export async function getReportCount(userId: string): Promise<number> {
  const key = redisKeys.userReports(userId);
  await redis.zremrangebyscore(key, 0, Date.now() - THIRTY_DAYS_MS);
  return await redis.zcard(key);
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const banned = await redis.get(redisKeys.userBanned(userId));
  if (banned === '1') {
    return true;
  }

  const count = await getReportCount(userId);
  if (count >= BAN_THRESHOLD) {
    await redis.set(redisKeys.userBanned(userId), '1');
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
