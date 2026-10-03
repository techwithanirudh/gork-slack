import { redis } from '../client';
import { keys } from '../keys';

export async function getOptedOutUsers(): Promise<Set<string>> {
  return new Set(await redis.smembers(keys.optedOutUsers()));
}

export async function isUserOptedOut(userId: string): Promise<boolean> {
  return await redis.sismember(keys.optedOutUsers(), userId);
}

// Returns the ids whose state actually changed.
export async function setOptedOut(
  userIds: string[],
  optedOut: boolean
): Promise<string[]> {
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const changed = optedOut
        ? await redis.sadd(keys.optedOutUsers(), userId)
        : await redis.srem(keys.optedOutUsers(), userId);
      return changed > 0 ? userId : null;
    })
  );
  return results.filter((userId): userId is string => userId !== null);
}
