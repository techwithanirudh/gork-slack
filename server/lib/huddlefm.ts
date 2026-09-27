import type { WebClient } from '@slack/web-api';
import { dj } from '~/config';
import { env } from '~/env';
import {
  clearDjSession,
  findDjSessionByRequest,
  getDjSession,
  setDjSession,
} from '~/lib/kv';
import logger from '~/lib/logger';

export interface HuddleFmReply {
  error?: string;
  message?: string;
  ok?: boolean;
  replyTo?: string;
  type?: string;
  v: number;
  [key: string]: unknown;
}

const waiters = new Map<string, (reply: HuddleFmReply) => void>();
// HuddleFM can answer before chat.postMessage resolves with the ts we wait on.
const earlyReplies = new Map<string, HuddleFmReply>();

let dmChannelId: string | undefined;

// Slack linkifies URLs and entity-escapes &, < and > in message text, which
// HuddleFM would read verbatim. JSON escapes keep the payload untouched.
const encode = (payload: Record<string, unknown>) =>
  JSON.stringify({ v: 1, ...payload })
    .replace(
      /[&<>]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
    )
    .replaceAll('/', '\\/');

const decode = (text: string): HuddleFmReply | null => {
  try {
    const parsed = JSON.parse(
      text
        .replace(/<((?:https?|mailto):[^|>]+)(?:\|[^>]*)?>/g, '$1')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
    );
    return parsed && typeof parsed === 'object' && parsed.v === 1
      ? (parsed as HuddleFmReply)
      : null;
  } catch {
    return null;
  }
};

export async function sendHuddleFmCommand({
  client,
  command,
  timeoutSeconds = dj.replyTimeout,
}: {
  client: WebClient;
  command: Record<string, unknown> & { type: string };
  timeoutSeconds?: number;
}): Promise<HuddleFmReply | null> {
  if (!env.HUDDLEFM_USER_ID) {
    throw new Error('HuddleFM is not configured');
  }
  if (!dmChannelId) {
    const opened = await client.conversations.open({
      users: env.HUDDLEFM_USER_ID,
    });
    dmChannelId = opened.channel?.id;
    if (!dmChannelId) {
      throw new Error('Could not open a DM with HuddleFM');
    }
  }

  const { ts } = await client.chat.postMessage({
    channel: dmChannelId,
    text: encode(command),
    unfurl_links: false,
    unfurl_media: false,
  });
  if (!ts) {
    throw new Error('Slack did not return a message timestamp');
  }
  logger.debug({ command, ts }, 'Sent HuddleFM command');

  const early = earlyReplies.get(ts);
  if (early) {
    earlyReplies.delete(ts);
    return early;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiters.delete(ts);
      resolve(null);
    }, timeoutSeconds * 1000);
    waiters.set(ts, (reply) => {
      clearTimeout(timer);
      waiters.delete(ts);
      resolve(reply);
    });
  });
}

async function announce({
  client,
  origin,
  text,
}: {
  client: WebClient;
  origin: { channel: string; threadTs?: string };
  text: string;
}) {
  await client.chat
    .postMessage({ channel: origin.channel, thread_ts: origin.threadTs, text })
    .catch((error) =>
      logger.warn({ error, origin }, 'Failed to announce DJ mode update')
    );
}

const GRANT_MESSAGES: Record<string, string> = {
  grant_accepted: dj.messages.accepted,
  grant_declined: dj.messages.declined,
  grant_expired: dj.messages.expired,
  grant_revoked: dj.messages.revoked,
};

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
    if (
      channel &&
      session &&
      (reply.event === 'session.ended' || reply.event === 'session.suspended')
    ) {
      await clearDjSession(channel);
      logger.info({ channel, event: reply.event }, 'DJ session ended');
      await announce({
        client,
        origin: session.origin,
        text: dj.messages.ended,
      });
    }
    return;
  }

  if (!reply.replyTo) {
    return;
  }

  const grantMessage = reply.type ? GRANT_MESSAGES[reply.type] : undefined;
  if (grantMessage) {
    const found = await findDjSessionByRequest(reply.replyTo);
    if (found) {
      if (reply.type === 'grant_accepted') {
        await setDjSession({
          channel: found.channel,
          session: { ...found.session, status: 'active' },
        });
      } else {
        await clearDjSession(found.channel);
      }
      logger.info(
        { channel: found.channel, type: reply.type },
        'DJ grant updated'
      );
      await announce({
        client,
        origin: found.session.origin,
        text: grantMessage,
      });
    }
  }

  const waiter = waiters.get(reply.replyTo);
  if (waiter) {
    waiter(reply);
  } else if (!grantMessage) {
    earlyReplies.set(reply.replyTo, reply);
    setTimeout(() => earlyReplies.delete(reply.replyTo ?? ''), 60_000);
  }
}
