import { restrictedChannels } from '~/config';
import type { ModeScope } from '~/lib/kv';

export function canManageModeScope({
  channelId,
  isAdmin,
  scope,
}: {
  channelId: string;
  isAdmin: boolean;
  scope: ModeScope;
}): boolean {
  if (scope === 'workspace') {
    return isAdmin;
  }
  return isAdmin || !restrictedChannels.some((c) => c.id === channelId);
}
