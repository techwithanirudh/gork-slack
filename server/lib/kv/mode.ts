import { redis } from './client';
import { redisKeys } from './keys';

export type ResponseMode = 'ping' | 'relevance' | 'ping+keyword' | 'none';

const DEFAULT_MODE: ResponseMode = 'relevance';

function isResponseMode(
  value: string | null | undefined
): value is ResponseMode {
  return (
    value === 'ping' ||
    value === 'relevance' ||
    value === 'ping+keyword' ||
    value === 'none'
  );
}

export async function setChannelMode(
  channelId: string,
  mode: ResponseMode
): Promise<void> {
  await redis.set(redisKeys.channelMode(channelId), mode);
}

export async function getChannelMode(channelId: string): Promise<ResponseMode> {
  const raw = await redis.get(redisKeys.channelMode(channelId));
  return isResponseMode(raw) ? raw : DEFAULT_MODE;
}

export async function clearChannelMode(channelId: string): Promise<void> {
  await redis.del(redisKeys.channelMode(channelId));
}
