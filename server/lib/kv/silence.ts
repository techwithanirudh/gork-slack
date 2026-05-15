import { redis } from './client';
import { redisKeys } from './keys';

const SILENCE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function setSilenced(contextId: string): Promise<void> {
  await redis.set(
    redisKeys.silenced(contextId),
    '1',
    'EX',
    SILENCE_TTL_SECONDS
  );
}

export async function isSilenced(contextId: string): Promise<boolean> {
  return Boolean(await redis.exists(redisKeys.silenced(contextId)));
}

export async function clearSilenced(contextId: string): Promise<void> {
  await redis.del(redisKeys.silenced(contextId));
}
