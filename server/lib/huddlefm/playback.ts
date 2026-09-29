import type { WebClient } from '@slack/web-api';
import { dj } from '~/config';
import { setDjPlayback } from '~/lib/kv';
import logger from '~/lib/logger';
import { type HuddleFmReply, runDjCommand } from './client';

export interface QueueTrack {
  artist?: string;
  automatic?: boolean;
  id?: string;
  title?: string;
}

export const describeTrack = (track: QueueTrack) =>
  `${track.title ?? 'unknown'} - ${track.artist ?? 'unknown'}`;

export async function savePlayback({
  channel,
  status,
}: {
  channel: string;
  status: HuddleFmReply;
}): Promise<void> {
  const queue = (status.queue as QueueTrack[] | undefined) ?? [];
  const nowPlaying = status.nowPlaying as QueueTrack | null | undefined;
  await setDjPlayback({
    channel,
    playback: {
      nowPlaying: nowPlaying ? describeTrack(nowPlaying) : undefined,
      queue: queue
        .slice(0, dj.stateQueueSize)
        .map(
          (track) =>
            `${describeTrack(track)} [trackId ${track.id}]${track.automatic ? ' (autoplay)' : ''}`
        ),
      queueLength: queue.length,
    },
  });
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function schedulePlaybackRefresh({
  client,
  channel,
}: {
  client: WebClient;
  channel: string;
}): void {
  clearTimeout(timers.get(channel));
  timers.set(
    channel,
    setTimeout(async () => {
      timers.delete(channel);
      try {
        const status = await runDjCommand({
          client,
          channel,
          command: { type: 'status' },
        });
        if (status?.ok) {
          await savePlayback({ channel, status });
        }
      } catch (error) {
        logger.warn({ error, channel }, 'Failed to refresh DJ playback');
      }
    }, dj.playbackRefreshDebounceSeconds * 1000)
  );
}
