import { tool } from 'ai';
import { z } from 'zod';
import { dj as djConfig } from '~/config';
import {
  addSong,
  type HuddleFmReply,
  LOST_GRANT,
  runDjCommand,
  sendHuddleFmCommand,
  topUpQueue,
} from '~/lib/huddlefm';
import {
  clearDjSession,
  type DjSession,
  getDjSession,
  listDjSessions,
  setDjSession,
} from '~/lib/kv';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

const CHANNEL_ID = /[CG][A-Z0-9]{6,}/;

const channelInput = z
  .string()
  .optional()
  .describe(
    'Slack channel ID (e.g. C123) of the channel the huddle is in. Omit to use the current channel.'
  );

// An explicit channel wins, then a session in the current channel, then the
// only session Gork holds.
async function resolveSession({
  context,
  channelArg,
}: {
  context: SlackMessageContext;
  channelArg?: string;
}): Promise<{ channel: string; session: DjSession } | null> {
  const explicit = channelArg?.match(CHANNEL_ID)?.[0];
  if (explicit) {
    const session = await getDjSession(explicit);
    return session ? { channel: explicit, session } : null;
  }
  const sessions = await listDjSessions();
  return (
    sessions.find((s) => s.channel === context.event.channel) ??
    (sessions.length === 1 ? sessions[0] : undefined) ??
    null
  );
}

const toolError = (error: unknown) => ({
  success: false,
  error: error instanceof Error ? error.message : String(error),
});

export const djMode = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Turn gork dj mode on or off for a huddle running HuddleFM. Turning it on asks the huddle host to let you control the music; they must approve it.',
    inputSchema: z.object({
      enabled: z.boolean().describe('true to start dj mode, false to stop'),
      channel: channelInput,
    }),
    execute: async ({ enabled, channel: channelArg }) => {
      const channel =
        channelArg?.match(CHANNEL_ID)?.[0] ??
        (context.event.channel_type === 'im'
          ? undefined
          : context.event.channel);
      if (!channel) {
        return {
          success: false,
          error:
            'No huddle channel. Ask which channel the huddle is in, or tell them to ask from that channel.',
        };
      }

      try {
        const existing = await getDjSession(channel);

        if (!enabled) {
          if (!existing) {
            return {
              success: false,
              error: 'DJ mode is not on in that channel',
            };
          }
          await clearDjSession(channel);
          const reply = await sendHuddleFmCommand({
            client: context.client,
            command: { type: 'release_control', channel },
          });
          logger.info({ channel, reply }, 'DJ mode disabled');
          return { success: true, content: 'DJ mode is off, control released' };
        }

        if (existing?.status === 'active') {
          return { success: true, content: 'DJ mode is already on here' };
        }

        const { ts, thread_ts, user } = context.event;
        const reply = await sendHuddleFmCommand({
          client: context.client,
          command: {
            type: 'request_control',
            channel,
            permissions: djConfig.permissions,
            events: djConfig.events,
          },
          timeoutSeconds: djConfig.requestGrace,
          onSent: (requestTs) =>
            setDjSession({
              channel,
              session: {
                status: 'pending',
                requestTs,
                requestedBy: user,
                origin: {
                  channel: context.event.channel ?? channel,
                  threadTs: thread_ts ?? ts,
                },
              },
            }),
        });
        logger.info({ channel, reply }, 'Requested DJ control');

        if (!reply) {
          return {
            success: true,
            content:
              'Request sent. The huddle host has to approve it in HuddleFM (expires in 5 minutes). An announcement is posted automatically when they answer, so just tell them you are waiting on the host.',
          };
        }
        if (reply.type?.startsWith('grant_')) {
          return {
            success: true,
            content: `Host already answered (${reply.type}) and it was announced. Do not repeat the announcement.`,
          };
        }
        await clearDjSession(channel);
        return {
          success: false,
          error:
            reply.error === 'session_not_found'
              ? 'There is no HuddleFM session in that channel. Someone has to start HuddleFM in the huddle first.'
              : (reply.message ??
                reply.error ??
                'HuddleFM refused the request'),
        };
      } catch (error) {
        logger.error({ error, channel }, 'Failed to toggle DJ mode');
        return toolError(error);
      }
    },
  });

export const dj = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Control the music in a huddle once gork dj mode is on: see what is playing, add songs, skip, pause, volume, and manage the queue.',
    inputSchema: z.object({
      command: z
        .enum([
          'status',
          'search',
          'add',
          'remove',
          'move',
          'shuffle',
          'skip',
          'previous',
          'pause',
          'resume',
          'seek',
          'volume',
        ])
        .describe(
          'status: now playing + queue. search: find songs. add: queue a song. remove/move: edit the queue by trackId. skip/previous/pause/resume. seek: jump by seconds. volume: set volume. shuffle: shuffle the queue.'
        ),
      channel: channelInput,
      query: z
        .string()
        .optional()
        .describe(
          'For search, or for add without a reference: "song name artist". add with only a query queues the top search result.'
        ),
      reference: z
        .string()
        .optional()
        .describe('For add: a reference from search results, or a media URL'),
      trackId: z
        .string()
        .optional()
        .describe('For remove/move: the track id from status'),
      direction: z
        .enum(['up', 'down'])
        .optional()
        .describe('For move: shift one spot'),
      playNext: z.boolean().optional().describe('For move: move to play next'),
      position: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('For move: 1-based queue position'),
      seconds: z
        .number()
        .optional()
        .describe('For seek: relative seconds, negative goes back'),
      percent: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('For volume: 0-100'),
    }),
    execute: async ({
      command,
      channel: channelArg,
      query,
      reference,
      ...rest
    }) => {
      try {
        const found = await resolveSession({ context, channelArg });
        if (!found) {
          return {
            success: false,
            error:
              'DJ mode is not on for this huddle. Turn it on with djMode first (or pass the huddle channel).',
          };
        }
        const { channel, session } = found;
        if (session.status === 'pending') {
          return {
            success: false,
            error: 'Still waiting for the huddle host to approve dj mode',
          };
        }

        let reply: HuddleFmReply | null;
        let matched: string | undefined;
        if (command === 'add' && !reference) {
          if (!query) {
            return { success: false, error: 'add needs a query or reference' };
          }
          ({ reply, matched } = await addSong({
            client: context.client,
            channel,
            query,
          }));
        } else {
          reply = await runDjCommand({
            client: context.client,
            channel,
            command: {
              type: command,
              ...(command === 'add' ? { reference } : { query }),
              ...rest,
            },
          });
        }
        logger.info({ channel, command, reply }, 'Ran DJ command');

        if (!reply) {
          return { success: false, error: 'HuddleFM did not answer in time' };
        }
        const { v: _v, replyTo: _replyTo, ok, ...data } = reply;
        if (!ok) {
          return {
            success: false,
            error: LOST_GRANT.has(reply.error ?? '')
              ? `${reply.error}: dj mode is off now, it has to be turned on again`
              : (reply.message ?? reply.error ?? 'Command failed'),
          };
        }
        return { success: true, data: matched ? { matched, ...data } : data };
      } catch (error) {
        logger.error({ error, command }, 'Failed to run DJ command');
        return toolError(error);
      }
    },
  });

export const autoDj = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Turn auto dj on or off: while on, you pick songs yourself and keep the huddle queue topped up without being asked. Needs dj mode (djMode) first.',
    inputSchema: z.object({
      enabled: z.boolean().describe('true to start picking songs yourself'),
      channel: channelInput,
    }),
    execute: async ({ enabled, channel: channelArg }) => {
      try {
        const found = await resolveSession({ context, channelArg });
        if (!found) {
          return {
            success: false,
            error: 'DJ mode is not on for this huddle. Call djMode first.',
          };
        }
        const { channel, session } = found;
        await setDjSession({
          channel,
          session: {
            ...session,
            autoDj: enabled
              ? { picks: session.autoDj?.picks ?? [] }
              : undefined,
          },
        });
        logger.info({ channel, enabled }, 'Auto dj toggled');

        if (!enabled) {
          return { success: true, content: 'Auto dj is off' };
        }
        if (session.status === 'pending') {
          return {
            success: true,
            content:
              'Auto dj will start picking songs as soon as the host approves dj mode',
          };
        }
        // Not awaited so the reply isn't held up by picking songs.
        topUpQueue({ client: context.client, channel });
        return {
          success: true,
          content:
            'Auto dj is on. You are picking songs and will keep the queue topped up whenever it runs low.',
        };
      } catch (error) {
        logger.error({ error }, 'Failed to toggle auto dj');
        return toolError(error);
      }
    },
  });
