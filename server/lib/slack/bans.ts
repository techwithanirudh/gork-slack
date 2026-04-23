import type { AllMiddlewareArgs } from '@slack/bolt';
import { banUser, isUserBanned, unbanUser } from '../reports';
import {
  sendBanLog,
  sendBanNotification,
  sendUnbanLog,
  sendUnbanNotification,
} from './notifications';

export async function executeBan(
  context: AllMiddlewareArgs,
  targetUserId: string,
  adminId: string
): Promise<'banned' | 'already_banned'> {
  const { client } = context;

  const alreadyBanned = await isUserBanned(targetUserId);
  if (alreadyBanned) {
    return 'already_banned';
  }

  await banUser(targetUserId);

  await Promise.all([
    sendBanNotification({ client, userId: targetUserId, bannedBy: adminId }),
    sendBanLog({ client, userId: targetUserId }),
  ]);

  return 'banned';
}

export async function executeUnban(
  context: AllMiddlewareArgs,
  targetUserId: string,
  adminId: string
): Promise<'unbanned' | 'not_banned'> {
  const { client } = context;

  const isBanned = await isUserBanned(targetUserId);
  if (!isBanned) {
    return 'not_banned';
  }

  await unbanUser(targetUserId);

  await Promise.all([
    sendUnbanNotification({
      client,
      userId: targetUserId,
      unbannedBy: adminId,
    }),
    sendUnbanLog({ client, userId: targetUserId }),
  ]);

  return 'unbanned';
}
