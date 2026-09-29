import type { WebClient } from '@slack/web-api';
import { tool } from 'ai';
import { z } from 'zod';
import { dj as djConfig } from '~/config';
import {
  addSong,
  type HuddleFmReply,
  LOST_GRANT,
  runDjCommand,
  savePlayback,
  schedulePlaybackRefresh,
  scheduleTopUp,
  sendHuddleFmCommand,
} from '~/lib/huddlefm';
import {
  clearDjSession,
  type DjSession,
  getDjSession,
  markDjRequestAbandoned,
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

const NOT_MEMBER = "You can only control the music in a channel you're in";

const resolveChannel = ({
  context,
  channelArg,
}: {
  context: SlackMessageContext;
  channelArg?: string;
}) =>
  channelArg?.match(CHANNEL_ID)?.[0] ??
  (context.event.channel_type === 'im' ? undefined : context.event.channel);

async function assertMember({
  context,
  channel,
}: {
  context: SlackMessageContext;
  channel: string;
}): Promise<void> {
  const { channel: current, user } = context.event;
  if (channel === current) {
    return;
  }
  if (!user) {
    throw new Error(NOT_MEMBER);
  }
  try {
    let cursor: string | undefined;
    do {
      const res = await context.client.conversations.members({
        channel,
        limit: 1000,
        cursor,
      });
      if (res.members?.includes(user)) {
        return;
      }
      cursor = res.response_metadata?.next_cursor || undefined;
    } while (cursor);
  } catch (error) {
    logger.warn({ error, channel, user }, 'Failed to check channel membership');
  }
  throw new Error(NOT_MEMBER);
}

async function resolveSession({
  context,
  channelArg,
}: {
  context: SlackMessageContext;
  channelArg?: string;
}): Promise<{ channel: string; session: DjSession } | null> {
  const channel = resolveChannel({ context, channelArg });
  if (!channel) {
    return null;
  }
  await assertMember({ context, channel });
  const session = await getDjSession(channel);
  return session ? { channel, session } : null;
}

const NO_SESSION =
  'DJ mode is not on in this channel. If the huddle is in another channel, pass its channel ID (from <dj-state>) as channel; otherwise turn dj mode on with djMode first.';

const toolError = (error: unknown) => ({
  success: false,
  error: error instanceof Error ? error.message : String(error),
});

async function runQueries({
  client,
  channel,
  command,
  queries,
}: {
  client: WebClient;
  channel: string;
  command: 'search' | 'add';
  queries: string[];
}): Promise<{ results: Record<string, unknown>[]; lost: boolean }> {
  const results: Record<string, unknown>[] = [];
  for (const query of queries) {
    const { reply, matched } =
      command === 'add'
        ? await addSong({ client, channel, query })
        : {
            reply: await runDjCommand({
              client,
              channel,
              command: { type: 'search', query },
            }),
            matched: undefined,
          };
    if (LOST_GRANT.has(reply?.error ?? '')) {
      results.push({
        query,
        error: `${reply?.error}: dj mode is off now, it has to be turned on again`,
      });
      return { results, lost: true };
    }
    if (!reply?.ok) {
      results.push({
        query,
        error: reply?.message ?? reply?.error ?? 'no reply',
      });
      continue;
    }
    results.push(
      command === 'add' ? { query, matched } : { query, results: reply.results }
    );
  }
  return { results, lost: false };
}

// HuddleFM skips one song per command.
async function skipSongs({
  client,
  channel,
  count,
}: {
  client: WebClient;
  channel: string;
  count: number;
}): Promise<HuddleFmReply | null> {
  const skipped: unknown[] = [];
  let lastOk: HuddleFmReply | undefined;
  let last: HuddleFmReply | null = null;
  for (let i = 0; i < count; i++) {
    last = await runDjCommand({ client, channel, command: { type: 'skip' } });
    if (!last?.ok) {
      break;
    }
    lastOk = last;
    skipped.push(last.skipped);
  }
  if (!lastOk) {
    return last;
  }
  return {
    ...lastOk,
    skipped,
    ...(skipped.length < count && {
      stoppedEarly: last?.message ?? last?.error ?? 'no reply',
    }),
  };
}

export const djMode = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Turn gork dj mode on or off for a huddle running HuddleFM. Turning it on asks the huddle host to let you control the music; they must approve it.',
    inputSchema: z.object({
      enabled: z.boolean().describe('true to start dj mode, false to stop'),
      channel: channelInput,
    }),
    execute: async ({ enabled, channel: channelArg }) => {
      try {
        const channel = resolveChannel({ context, channelArg });
        if (!channel) {
          return {
            success: false,
            error:
              'No huddle channel. Ask which channel the huddle is in, or tell them to ask from that channel.',
          };
        }
        await assertMember({ context, channel });

        const existing = await getDjSession(channel);

        if (!enabled) {
          if (!existing) {
            return {
              success: false,
              error: 'DJ mode is not on in that channel',
            };
          }
          await clearDjSession(channel);
          if (existing.status === 'pending') {
            await markDjRequestAbandoned({
              requestTs: existing.requestTs,
              channel,
            });
            logger.info({ channel }, 'DJ request cancelled');
            return {
              success: true,
              content:
                'DJ mode request cancelled. If the host approves it later, control is released right away.',
            };
          }
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
        if (existing?.status === 'pending') {
          return {
            success: true,
            content:
              'Already waiting for the huddle host to approve dj mode. An announcement is posted when they answer.',
          };
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
          timeoutSeconds: djConfig.requestGraceSeconds,
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
                ...(djConfig.auto.enabledByDefault && {
                  autoDj: { picks: [] },
                }),
                chatter: djConfig.chatter.enabledByDefault,
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
        logger.error(
          { error, channel: channelArg },
          'Failed to toggle DJ mode'
        );
        return toolError(error);
      }
    },
  });

const stepSchema = z.object({
  command: z
    .enum([
      'status',
      'search',
      'add',
      'remove',
      'move',
      'shuffle',
      'clear',
      'skip',
      'previous',
      'pause',
      'resume',
      'seek',
      'volume',
    ])
    .describe(
      'status: now playing + full queue. search: find songs. add: queue a song. remove/move: edit the queue by trackId. skip (optionally count songs)/previous/pause/resume. seek: jump by seconds. volume: set volume. shuffle: shuffle the queue. clear: empty the whole queue.'
    ),
  query: z
    .string()
    .optional()
    .describe(
      'For search, or for add without a reference: "song name artist". add with only a query queues the top search result.'
    ),
  queries: z
    .array(z.string())
    .min(1)
    .max(djConfig.maxBatch)
    .optional()
    .describe(
      'For search/add: several "song name artist" queries at once, instead of query. add queues the top result for each, in order.'
    ),
  reference: z
    .string()
    .optional()
    .describe('For add: a reference from search results, or a media URL'),
  trackId: z
    .string()
    .optional()
    .describe('For remove/move: the track id from <dj-state> or status'),
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
  count: z
    .number()
    .int()
    .min(1)
    .max(djConfig.maxSkip)
    .optional()
    .describe('For skip: how many songs to skip, default 1'),
  seconds: z
    .number()
    .optional()
    .describe('For seek: relative seconds, negative goes back'),
  percent: z.number().min(0).max(100).optional().describe('For volume: 0-100'),
});

const READ_ONLY = new Set(['status', 'search']);

async function runStep({
  client,
  channel,
  step: { command, query, queries, reference, count = 1, ...rest },
}: {
  client: WebClient;
  channel: string;
  step: z.infer<typeof stepSchema>;
}): Promise<Record<string, unknown> & { success: boolean; lost?: boolean }> {
  if (queries && (command === 'search' || command === 'add')) {
    const { results, lost } = await runQueries({
      client,
      channel,
      command,
      queries,
    });
    return { success: results.some((r) => !r.error), lost, results };
  }

  let reply: HuddleFmReply | null;
  let matched: string | undefined;
  if (command === 'skip' && count > 1) {
    reply = await skipSongs({ client, channel, count });
  } else if (command === 'add' && !reference) {
    if (!query) {
      return { success: false, error: 'add needs a query or reference' };
    }
    ({ reply, matched } = await addSong({ client, channel, query }));
  } else {
    reply = await runDjCommand({
      client,
      channel,
      command: {
        type: command,
        ...(command === 'add' ? { reference } : { query }),
        ...rest,
      },
    });
  }

  if (!reply) {
    return { success: false, error: 'HuddleFM did not answer in time' };
  }
  const { v: _v, replyTo: _replyTo, ok, ...data } = reply;
  if (!ok) {
    const lost = LOST_GRANT.has(reply.error ?? '');
    return {
      success: false,
      lost,
      error: lost
        ? `${reply.error}: dj mode is off now, it has to be turned on again`
        : (reply.message ?? reply.error ?? 'Command failed'),
    };
  }
  if (command === 'status') {
    await savePlayback({ channel, status: reply });
  }
  return { success: true, data: matched ? { matched, ...data } : data };
}

export const dj = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Control the music in a huddle once gork dj mode is on: add songs, skip, pause, volume, and manage the queue. Pass every step of a request as commands in ONE call; they run in order.',
    inputSchema: z.object({
      channel: channelInput,
      commands: z
        .array(stepSchema)
        .min(1)
        .max(djConfig.maxCommands)
        .describe(
          'Steps to run in order, e.g. [{command:"skip",count:2},{command:"add",queries:[...]},{command:"volume",percent:40}]'
        ),
    }),
    execute: async ({ channel: channelArg, commands }) => {
      try {
        const found = await resolveSession({ context, channelArg });
        if (!found) {
          return { success: false, error: NO_SESSION };
        }
        const { channel, session } = found;
        if (session.status === 'pending') {
          return {
            success: false,
            error: 'Still waiting for the huddle host to approve dj mode',
          };
        }

        const results: Record<string, unknown>[] = [];
        for (const step of commands) {
          const { lost, ...result } = await runStep({
            client: context.client,
            channel,
            step,
          });
          results.push({ command: step.command, ...result });
          if (lost) {
            break;
          }
        }
        logger.info({ channel, commands, results }, 'Ran DJ commands');

        if (commands.some((step) => !READ_ONLY.has(step.command))) {
          schedulePlaybackRefresh({ client: context.client, channel });
        }
        return {
          success: results.some((result) => result.success),
          results,
        };
      } catch (error) {
        logger.error({ error, commands }, 'Failed to run DJ commands');
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
          return { success: false, error: NO_SESSION };
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
        scheduleTopUp({ client: context.client, channel });
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

export const djChatter = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Turn dj chatter on or off: while on, you chime in now and then when a new song starts. Turn it off when people tell you to shut up or stop commenting on songs.',
    inputSchema: z.object({
      enabled: z.boolean().describe('true to chime in between songs'),
      channel: channelInput,
    }),
    execute: async ({ enabled, channel: channelArg }) => {
      try {
        const found = await resolveSession({ context, channelArg });
        if (!found) {
          return { success: false, error: NO_SESSION };
        }
        await setDjSession({
          channel: found.channel,
          session: { ...found.session, chatter: enabled },
        });
        logger.info({ channel: found.channel, enabled }, 'DJ chatter toggled');
        return {
          success: true,
          content: enabled
            ? 'Chatter is on, you chime in now and then when a song starts'
            : 'Chatter is off, you stay quiet between songs',
        };
      } catch (error) {
        logger.error({ error }, 'Failed to toggle dj chatter');
        return toolError(error);
      }
    },
  });
