import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import logger from '~/lib/logger';

const adminUserIds = new Set(env.ADMINS ?? []);

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}

export async function isChannelAdmin(
  userId: string,
  channelId: string,
  client: WebClient
): Promise<boolean> {
  if (isAdmin(userId)) {
    return true;
  }
  try {
    const [userInfo, channelInfo] = await Promise.all([
      client.users.info({ user: userId }),
      client.conversations.info({ channel: channelId }),
    ]);
    const workspaceAdmin =
      userInfo.user?.is_admin === true || userInfo.user?.is_owner === true;
    const channelCreator =
      (channelInfo.channel as { creator?: string } | undefined)?.creator ===
      userId;
    return workspaceAdmin || channelCreator;
  } catch (error) {
    logger.warn(
      { error, userId, channelId },
      'Failed to check channel admin status'
    );
    return false;
  }
}
