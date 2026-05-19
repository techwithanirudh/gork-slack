import { rateLimit } from '~/config';
import { redis } from '../client';

export async function ratelimit(
  contextId: string
): Promise<{ success: boolean }> {
  const now = Date.now();
  const key = `slack:${contextId}`;
  await redis.zadd(key, now, now.toString());
  await redis.zremrangebyscore(key, 0, now - rateLimit.windowSeconds * 1000);
  const [count] = await Promise.all([
    redis.zcard(key),
    redis.expire(key, rateLimit.windowSeconds),
  ]);
  return { success: count <= rateLimit.windowLimit };
}
