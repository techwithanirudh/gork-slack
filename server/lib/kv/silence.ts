import { redis } from './client';

const SILENCE_KEY = (contextId: string) => `ctx:silenced:${contextId}`;
const SILENCE_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function setSilenced(contextId: string): Promise<void> {
  await redis.set(SILENCE_KEY(contextId), '1', 'EX', SILENCE_TTL_SECONDS);
}

export async function isSilenced(contextId: string): Promise<boolean> {
  return Boolean(await redis.exists(SILENCE_KEY(contextId)));
}

export async function clearSilenced(contextId: string): Promise<void> {
  await redis.del(SILENCE_KEY(contextId));
}
