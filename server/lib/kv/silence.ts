import { redis } from './client';
import { keys } from './keys';

const SILENCE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function setSilenced(contextId: string): Promise<void> {
  await redis.set(keys.silenced(contextId), '1', 'EX', SILENCE_TTL_SECONDS);
}

export async function isSilenced(contextId: string): Promise<boolean> {
  return Boolean(await redis.exists(keys.silenced(contextId)));
}

export async function clearSilenced(contextId: string): Promise<void> {
  await redis.del(keys.silenced(contextId));
}
