import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import logger from '~/lib/logger';

const adminUserIds = new Set(env.ADMINS ?? []);

const CHANNEL_MANAGER_ROLE_ID = 'Rl0A';

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}

async function isChannelManagerViaRoles(
  userId: string,
  channelId: string,
  client: WebClient
): Promise<boolean> {
  const result = await client.admin.roles.listAssignments({
    role_ids: [CHANNEL_MANAGER_ROLE_ID],
    entity_ids: [channelId],
    limit: 200,
  });
  return result.role_assignments?.some((a) => a.user_id === userId) ?? false;
}

async function isChannelCreator(
  userId: string,
  channelId: string,
  client: WebClient
): Promise<boolean> {
  const { channel } = await client.conversations.info({ channel: channelId });
  return (channel as { creator?: string } | undefined)?.creator === userId;
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
    return await isChannelManagerViaRoles(userId, channelId, client);
  } catch (rolesError) {
    logger.debug(
      { rolesError, userId, channelId },
      'admin.roles.listAssignments unavailable, falling back to creator check'
    );
  }

  try {
    return await isChannelCreator(userId, channelId, client);
  } catch (error) {
    logger.warn(
      { error, userId, channelId },
      'Failed to check channel admin status'
    );
    return false;
  }
}
