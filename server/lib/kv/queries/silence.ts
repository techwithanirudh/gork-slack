import { rateLimit } from '~/config';
import { redis } from '../client';
import { keys } from '../keys';

export async function setSilenced(contextId: string): Promise<void> {
  await redis.set(keys.silenced(contextId), '1', 'EX', rateLimit.silence.ttl);
}

export async function isSilenced(contextId: string): Promise<boolean> {
  return await redis.exists(keys.silenced(contextId));
}

export async function clearSilenced(contextId: string): Promise<void> {
  await redis.del(keys.silenced(contextId));
}
