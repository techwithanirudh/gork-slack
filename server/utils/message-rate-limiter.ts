import { rateLimit } from '~/config';
import { keys, redis } from '~/lib/kv';

export async function resetMessageCount(ctxId: string): Promise<void> {
  await redis.del(keys.messageCount(ctxId));
}

export async function checkMessageQuota(ctxId: string): Promise<{
  count: number;
  hasQuota: boolean;
}> {
  const n = await redis.get(keys.messageCount(ctxId));
  const count = n ? Number(n) : 0;
  return {
    count,
    hasQuota: count < rateLimit.quota.threshold,
  };
}

export async function handleMessageCount(
  ctxId: string,
  willReply: boolean
): Promise<number> {
  const key = keys.messageCount(ctxId);

  if (willReply) {
    await redis.del(key);
    return 0;
  }

  const [count] = await Promise.all([
    redis.incr(key),
    redis.expire(key, rateLimit.quota.ttl),
  ]);
  return count || 1;
}
