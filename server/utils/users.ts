import type { WebClient } from '@slack/web-api';
import logger from '~/lib/logger';

const userNameCache = new Map<string, string>();

const WHITESPACE_PATTERN = /\s+/;
const USER_MENTION_PATTERN = /^<@([A-Z0-9]+)(?:\|[^>]+)?>$/;
const USER_ID_PATTERN = /^[UW][A-Z0-9]+$/;

export async function getSlackUserName(
  client: WebClient,
  userId: string
): Promise<string> {
  if (!userId) {
    return 'unknown';
  }

  const cached = userNameCache.get(userId);
  if (cached) {
    return cached;
  }

  try {
    const info = await client.users.info({ user: userId });
    const name =
      info.user?.profile?.display_name ||
      info.user?.real_name ||
      info.user?.name ||
      userId;
    userNameCache.set(userId, name);
    return name;
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to fetch Slack user info');
    userNameCache.set(userId, userId);
    return userId;
  }
}

export function primeSlackUserName(userId: string, name: string) {
  if (!userId) {
    return;
  }
  userNameCache.set(userId, name);
}

export function normalizeSlackUserId(raw: string): string {
  return raw.replace(/[<@>]/g, '').trim();
}

export function parseUserList(args: string): string[] {
  const trimmed = args.trim();
  if (!trimmed) {
    return [];
  }

  const tokens = trimmed.split(WHITESPACE_PATTERN);
  const targets = new Set<string>();

  for (const token of tokens) {
    const mentionMatch = token.match(USER_MENTION_PATTERN);
    if (mentionMatch?.[1]) {
      targets.add(mentionMatch[1]);
      continue;
    }

    if (USER_ID_PATTERN.test(token)) {
      targets.add(token);
    }
  }

  return [...targets];
}
