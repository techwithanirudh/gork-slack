import { RedisClient } from 'bun';
import { env } from '~/env';

export const redis = new RedisClient(env.REDIS_URL);

export type ResponseMode = 'ping' | 'relevance' | 'ping+keyword' | 'none';

const VALID_MODES = new Set<ResponseMode>([
  'ping',
  'relevance',
  'ping+keyword',
  'none',
]);

export const redisKeys = {
  messageCount: (contextId: string) => `ctx:messageCount:${contextId}`,
  channelCount: (contextId: string) => `ctx:channelCount:${contextId}`,
  userReports: (userId: string) => `user:reports:${userId}`,
  userBanned: (userId: string) => `user:banned:${userId}`,
  silenced: (contextId: string) => `ctx:silenced:${contextId}`,
  channelMode: (channelId: string) => `ctx:mode:${channelId}`,
};

export async function ratelimit(contextId: string) {
  const now = Date.now();

  const key = `slack:${contextId}`;

  await redis.zadd(key, now, now.toString());
  await redis.zremrangebyscore(key, 0, now - 30 * 1000);
  const results = await Promise.all([redis.zcard(key), redis.expire(key, 30)]);

  const count = results[0];
  return { success: count <= 56 };
}

export async function setSilenced(contextId: string): Promise<void> {
  await redis.set(redisKeys.silenced(contextId), '1', 'EX', 60 * 60 * 24 * 7);
}

export async function isSilenced(contextId: string): Promise<boolean> {
  const result = await redis.exists(redisKeys.silenced(contextId));
  return Boolean(result);
}

export async function clearSilenced(contextId: string): Promise<void> {
  await redis.del(redisKeys.silenced(contextId));
}

export async function setChannelMode(
  channelId: string,
  mode: ResponseMode
): Promise<void> {
  await redis.set(redisKeys.channelMode(channelId), mode);
}

export async function getChannelMode(channelId: string): Promise<ResponseMode> {
  const raw = await redis.get(redisKeys.channelMode(channelId));
  if (raw && VALID_MODES.has(raw as ResponseMode)) {
    return raw as ResponseMode;
  }
  return 'relevance';
}

export async function clearChannelMode(channelId: string): Promise<void> {
  await redis.del(redisKeys.channelMode(channelId));
}
