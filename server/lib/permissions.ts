import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import logger from '~/lib/logger';

const admins = new Set(env.ADMINS ?? []);

export async function isAdmin(
  client: WebClient,
  userId: string
): Promise<boolean> {
  if (admins.has(userId)) {
    return true;
  }

  try {
    const info = await client.users.info({ user: userId });
    return Boolean(info.user?.is_admin || info.user?.is_owner);
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to fetch user info for admin check');
    return false;
  }
}
