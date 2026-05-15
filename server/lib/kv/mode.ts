import { redis } from './client';

const MODE_KEY = (channelId: string) => `ctx:mode:${channelId}`;

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
  await redis.set(MODE_KEY(channelId), mode);
}

export async function getChannelMode(channelId: string): Promise<ResponseMode> {
  const raw = await redis.get(MODE_KEY(channelId));
  return isResponseMode(raw) ? raw : DEFAULT_MODE;
}

export async function clearChannelMode(channelId: string): Promise<void> {
  await redis.del(MODE_KEY(channelId));
}
