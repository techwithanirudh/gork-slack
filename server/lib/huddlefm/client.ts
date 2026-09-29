import type { WebClient } from '@slack/web-api';
import { dj } from '~/config';
import { env } from '~/env';
import { clearDjSession } from '~/lib/kv';
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

// Slack turns URLs into links and entity-escapes &, < and > in message text, which
// HuddleFM would read verbatim. JSON escapes keep the payload untouched.
const encode = (payload: Record<string, unknown>) =>
  JSON.stringify({ v: 1, ...payload })
    .replace(
      /[&<>]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
    )
    .replaceAll('/', '\\/');

export const decode = (text: string): HuddleFmReply | null => {
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
  timeoutSeconds = dj.replyTimeoutSeconds,
  onSent,
}: {
  client: WebClient;
  command: Record<string, unknown> & { type: string };
  timeoutSeconds?: number;
  onSent?: (ts: string) => Promise<void>;
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
  await onSent?.(ts);

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

export function deliverReply(reply: HuddleFmReply & { replyTo: string }) {
  const waiter = waiters.get(reply.replyTo);
  if (waiter) {
    waiter(reply);
    return;
  }
  earlyReplies.set(reply.replyTo, reply);
  setTimeout(() => earlyReplies.delete(reply.replyTo), 60_000);
}

export const LOST_GRANT = new Set([
  'not_granted',
  'session_not_found',
  'session_inactive',
]);

export async function runDjCommand({
  client,
  channel,
  command,
}: {
  client: WebClient;
  channel: string;
  command: Record<string, unknown> & { type: string };
}): Promise<HuddleFmReply | null> {
  const reply = await sendHuddleFmCommand({
    client,
    command: { ...command, channel },
  });
  if (reply?.error && LOST_GRANT.has(reply.error)) {
    await clearDjSession(channel);
  }
  return reply;
}

export const pickLabel = (track: { title?: string; artist?: string }) =>
  [track.title, track.artist].filter(Boolean).join(' - ');

export async function addSong({
  client,
  channel,
  query,
}: {
  client: WebClient;
  channel: string;
  query: string;
}): Promise<{ reply: HuddleFmReply | null; matched?: string }> {
  const search = await runDjCommand({
    client,
    channel,
    command: { type: 'search', query },
  });
  const top = (
    search?.results as { label: string; reference: string }[] | undefined
  )?.[0];
  if (!(search?.ok && top)) {
    return {
      reply: search?.ok
        ? { v: 1, ok: false, error: `No results for "${query}"` }
        : search,
    };
  }
  const reply = await runDjCommand({
    client,
    channel,
    command: { type: 'add', reference: top.reference },
  });
  const first = (
    reply?.added as { title?: string; artist?: string }[] | undefined
  )?.[0];
  return {
    reply,
    matched: first?.title ? pickLabel(first) : top.label,
  };
}
