import { redis } from './client';

const WINDOW_SECONDS = 30;
const WINDOW_LIMIT = 56; // ~2 per second over the 30s window

export async function ratelimit(
  contextId: string
): Promise<{ success: boolean }> {
  const now = Date.now();
  const key = `slack:${contextId}`;
  await redis.zadd(key, now, now.toString());
  await redis.zremrangebyscore(key, 0, now - WINDOW_SECONDS * 1000);
  const [count] = await Promise.all([
    redis.zcard(key),
    redis.expire(key, WINDOW_SECONDS),
  ]);

  return { success: count <= WINDOW_LIMIT };
}
