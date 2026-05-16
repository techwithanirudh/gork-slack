import { redis } from './client';
import { keys } from './keys';

export const MODES = {
  ping: 'ping only',
  relevance: 'relevance (default)',
  'ping+keyword': 'ping + keyword',
  none: 'none',
} as const;

export type ResponseMode = keyof typeof MODES;
export type ModeScope = 'workspace' | 'channel';

const DEFAULT_MODE: ResponseMode = 'relevance';

export function isResponseMode(
  value: string | null | undefined
): value is ResponseMode {
  return value != null && value in MODES;
}

export async function setMode({
  scope,
  id,
  mode,
}: {
  scope: ModeScope;
  id: string;
  mode: ResponseMode;
}): Promise<void> {
  const key =
    scope === 'workspace' ? keys.workspaceMode(id) : keys.channelMode(id);
  await redis.set(key, mode);
}

export async function clearMode({
  scope,
  id,
}: {
  scope: ModeScope;
  id: string;
}): Promise<void> {
  const key =
    scope === 'workspace' ? keys.workspaceMode(id) : keys.channelMode(id);
  await redis.del(key);
}

export async function getStoredMode({
  scope,
  id,
}: {
  scope: ModeScope;
  id: string;
}): Promise<ResponseMode | null> {
  const key =
    scope === 'workspace' ? keys.workspaceMode(id) : keys.channelMode(id);
  const raw = await redis.get(key);
  return isResponseMode(raw) ? raw : null;
}

export async function getEffectiveMode({
  workspaceId,
  channelId,
}: {
  workspaceId?: string;
  channelId?: string;
}): Promise<ResponseMode> {
  if (channelId) {
    const raw = await redis.get(keys.channelMode(channelId));
    if (isResponseMode(raw)) {
      return raw;
    }
  }
  if (workspaceId) {
    const raw = await redis.get(keys.workspaceMode(workspaceId));
    if (isResponseMode(raw)) {
      return raw;
    }
  }
  return DEFAULT_MODE;
}
