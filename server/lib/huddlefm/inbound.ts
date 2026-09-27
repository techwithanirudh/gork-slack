import type { WebClient } from '@slack/web-api';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { djAnnouncementPrompt } from '~/lib/ai/prompts/dj';
import { provider } from '~/lib/ai/providers';
import {
  clearDjSession,
  type DjSession,
  findDjSessionByRequest,
  getDjSession,
  setDjSession,
} from '~/lib/kv';
import logger from '~/lib/logger';
import { stripBroadcastMentions } from '~/utils/text';
import { topUpQueue } from './auto-dj';
import { decode, deliverReply } from './client';
import { getDjContext } from './context';

async function announce({
  client,
  channel,
  session,
  situation,
}: {
  client: WebClient;
  channel: string;
  session: DjSession;
  situation: string;
}) {
  try {
    const { messages, memories } = await getDjContext({
      client,
      session,
      queries: [situation],
    });
    const { output } = await generateText({
      model: provider.languageModel('chat-model'),
      system: djAnnouncementPrompt({
        situation,
        channel,
        autoDj: Boolean(session.autoDj),
        memories,
      }),
      messages: [
        ...messages,
        { role: 'user', content: `DJ update to post now: ${situation}` },
      ],
      output: Output.object({
        schema: z.object({ lines: z.array(z.string().min(1)).min(1).max(2) }),
      }),
      temperature: 1.1,
      experimental_telemetry: { isEnabled: true, functionId: 'dj-announce' },
    });
    for (const line of output.lines) {
      await client.chat.postMessage({
        channel: session.origin.channel,
        thread_ts: session.origin.threadTs,
        text: stripBroadcastMentions(line),
      });
    }
  } catch (error) {
    logger.warn({ error, channel }, 'Failed to announce DJ mode update');
  }
}

// Facts for the model to announce in its own words; never posted verbatim.
const GRANT_SITUATIONS: Record<string, string> = {
  grant_accepted:
    'The huddle host approved your dj request. You now control the music.',
  grant_declined: 'The huddle host declined your request to be the dj.',
  grant_expired:
    'Nobody approved your dj request within 5 minutes, so it expired.',
  grant_revoked: 'The huddle host took dj control away from you.',
};

const TOP_UP_EVENTS = new Set([
  'track.started',
  'track.finished',
  'track.failed',
]);

export async function handleHuddleFmMessage({
  client,
  text,
}: {
  client: WebClient;
  text: string;
}): Promise<void> {
  const reply = decode(text);
  if (!reply) {
    return;
  }

  if (reply.type === 'event') {
    const channel = typeof reply.channel === 'string' ? reply.channel : null;
    const session = channel ? await getDjSession(channel) : null;
    if (!(channel && session)) {
      return;
    }
    if (
      reply.event === 'session.ended' ||
      reply.event === 'session.suspended'
    ) {
      await clearDjSession(channel);
      logger.info({ channel, event: reply.event }, 'DJ session ended');
      await announce({
        client,
        channel,
        session,
        situation:
          'The HuddleFM session in the huddle ended, so dj mode is over.',
      });
    } else if (
      session.autoDj &&
      typeof reply.event === 'string' &&
      TOP_UP_EVENTS.has(reply.event)
    ) {
      // Not awaited: topping up waits on HuddleFM replies that arrive as later events.
      topUpQueue({ client, channel });
    }
    return;
  }

  const { replyTo } = reply;
  if (!replyTo) {
    return;
  }

  const situation = reply.type ? GRANT_SITUATIONS[reply.type] : undefined;
  if (!situation) {
    deliverReply({ ...reply, replyTo });
    return;
  }

  const found = await findDjSessionByRequest(replyTo);
  if (!found) {
    return;
  }
  const session: DjSession = { ...found.session, status: 'active' };
  if (reply.type === 'grant_accepted') {
    await setDjSession({ channel: found.channel, session });
  } else {
    await clearDjSession(found.channel);
  }
  logger.info({ channel: found.channel, type: reply.type }, 'DJ grant updated');
  await announce({
    client,
    channel: found.channel,
    session: reply.type === 'grant_accepted' ? session : found.session,
    situation,
  });
  if (reply.type === 'grant_accepted') {
    topUpQueue({ client, channel: found.channel });
  }
}
