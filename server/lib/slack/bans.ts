import type { AllMiddlewareArgs } from '@slack/bolt';
import { banUser, isUserBanned, unbanUser } from '../reports';
import { sendBanNotification, sendUnbanNotification } from './notifications';

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

  await sendBanNotification({
    client,
    userId: targetUserId,
    bannedBy: adminId,
  });

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

  await sendUnbanNotification({
    client,
    userId: targetUserId,
    unbannedBy: adminId,
  });

  return 'unbanned';
}
