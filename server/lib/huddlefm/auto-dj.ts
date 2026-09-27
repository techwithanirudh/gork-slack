import type { WebClient } from '@slack/web-api';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { dj } from '~/config';
import { autoDjPrompt } from '~/lib/ai/prompts/dj';
import { provider } from '~/lib/ai/providers';
import { getDjSession, setDjSession } from '~/lib/kv';
import logger from '~/lib/logger';
import { addSong, LOST_GRANT, runDjCommand } from './client';
import { getDjContext } from './context';

export interface QueueTrack {
  artist?: string;
  automatic?: boolean;
  title?: string;
}

const running = new Set<string>();
const lastTopUp = new Map<string, number>();

export async function topUpQueue({
  client,
  channel,
}: {
  client: WebClient;
  channel: string;
}): Promise<void> {
  if (
    running.has(channel) ||
    Date.now() - (lastTopUp.get(channel) ?? 0) < dj.auto.cooldown * 1000
  ) {
    return;
  }
  running.add(channel);
  try {
    const session = await getDjSession(channel);
    if (!(session?.status === 'active' && session.autoDj)) {
      return;
    }

    const status = await runDjCommand({
      client,
      channel,
      command: { type: 'status' },
    });
    if (!status?.ok) {
      logger.warn({ channel, status }, 'Auto dj could not read status');
      return;
    }
    const queue = (status.queue as QueueTrack[] | undefined) ?? [];
    const nowPlaying = (status.nowPlaying as QueueTrack | null) ?? null;
    const room = Math.min(
      dj.auto.batchSize,
      (typeof status.queueLimit === 'number' ? status.queueLimit : 100) -
        queue.length
    );
    if (
      queue.filter((track) => !track.automatic).length >= dj.auto.minQueue ||
      room <= 0
    ) {
      return;
    }
    lastTopUp.set(channel, Date.now());

    const { picks } = session.autoDj;
    const describe = (track: QueueTrack) =>
      `${track.title ?? 'unknown'} - ${track.artist ?? 'unknown'}`;
    const playing = nowPlaying ? describe(nowPlaying) : '';
    const { messages, memories } = await getDjContext({
      client,
      session,
      queries: [
        playing && `music ${playing}`,
        'favorite songs artists music taste',
      ],
    });

    const { output } = await generateText({
      model: provider.languageModel('chat-model'),
      system: autoDjPrompt({
        nowPlaying: playing,
        queue: queue.map(describe),
        recentPicks: picks,
        count: room,
        memories,
      }),
      messages: [
        ...messages,
        { role: 'user', content: `Pick the next ${room} songs.` },
      ],
      output: Output.object({
        schema: z.object({
          songs: z
            .array(z.object({ title: z.string(), artist: z.string() }))
            .max(room),
        }),
      }),
      temperature: 1,
      experimental_telemetry: { isEnabled: true, functionId: 'auto-dj' },
    });

    const added: string[] = [];
    for (const song of output.songs.slice(0, room)) {
      const { reply, matched } = await addSong({
        client,
        channel,
        query: `${song.title} ${song.artist}`,
      });
      if (reply?.ok) {
        added.push(matched ?? `${song.title} - ${song.artist}`);
      } else if (
        reply?.error === 'queue_full' ||
        LOST_GRANT.has(reply?.error ?? '')
      ) {
        break;
      }
    }
    logger.info({ channel, picks: output.songs, added }, 'Auto dj topped up');

    // Re-read so a toggle made while picking isn't overwritten.
    const latest = await getDjSession(channel);
    if (latest?.autoDj && added.length) {
      await setDjSession({
        channel,
        session: {
          ...latest,
          autoDj: {
            ...latest.autoDj,
            picks: [...latest.autoDj.picks, ...added].slice(
              -dj.auto.historySize
            ),
          },
        },
      });
    }
  } catch (error) {
    logger.error({ error, channel }, 'Auto dj top-up failed');
  } finally {
    running.delete(channel);
  }
}
