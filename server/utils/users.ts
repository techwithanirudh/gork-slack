import type { WebClient } from '@slack/web-api';
import logger from '~/lib/logger';
import { splitArgs } from '~/utils/text';

const userNameCache = new Map<string, string>();

const USER_ID_PATTERN = /^[UW][A-Z0-9]+$/;
const USER_MENTION_RE = /^<@([A-Z0-9]+)(?:\|[^>]+)?>$/;

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
  const match = USER_MENTION_RE.exec(raw);
  return match?.[1] ?? raw.trim();
}

export function parseUserList(args: string): string[] {
  return [
    ...new Set(
      splitArgs(args)
        .map(normalizeSlackUserId)
        .filter((id) => USER_ID_PATTERN.test(id))
    ),
  ];
}
