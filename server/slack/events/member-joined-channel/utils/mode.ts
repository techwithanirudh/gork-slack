import type { WebClient } from '@slack/web-api';
import { channelMode as channelModeConfig } from '~/config';
import { getStoredMode, MODES, type ResponseMode, setMode } from '~/lib/kv';
import logger from '~/lib/logger';

export async function countChannelMembers(
  client: WebClient,
  channelId: string
): Promise<number> {
  const { largeChannelThreshold } = channelModeConfig;
  let members = 0;
  let cursor: string | undefined;
  do {
    const res = await client.conversations.members({
      channel: channelId,
      limit: largeChannelThreshold,
      cursor,
    });
    members += res.members?.length ?? 0;
    cursor =
      members < largeChannelThreshold
        ? (res.response_metadata?.next_cursor ?? undefined)
        : undefined;
  } while (cursor);
  return members;
}

interface ModeAssignment {
  label: string;
  mode: ResponseMode;
  reason: string;
}

export async function resolveMode(
  channelId: string,
  memberCount: number
): Promise<ModeAssignment> {
  const existing = await getStoredMode({ scope: 'channel', id: channelId });
  if (existing) {
    return {
      mode: existing,
      label: MODES[existing],
      reason: '(already configured)',
    };
  }

  if (memberCount >= channelModeConfig.largeChannelThreshold) {
    try {
      await setMode({ scope: 'channel', id: channelId, mode: 'ping' });
      logger.info(
        { channelId, memberCount },
        'Auto-set channel mode to ping on bot join'
      );
    } catch (error) {
      logger.error({ error, channelId }, 'Failed to auto-set channel mode');
    }
    return {
      mode: 'ping',
      label: MODES.ping,
      reason: '(large channel, defaults to ping only)',
    };
  }

  return {
    mode: 'relevance',
    label: MODES.relevance,
    reason: '(smaller channel, defaults to relevance)',
  };
}
