import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import {
  banUser,
  isAdmin,
  isUserBanned,
  sendBanNotification,
} from '~/lib/reports';

export const name = 'ban_user';

export async function execute({
  ack,
  action,
  body,
  client,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs) {
  await ack();

  if (!isAdmin(body.user.id)) {
    return;
  }

  const userId = action.value;

  if (!userId) {
    return;
  }

  const alreadyBanned = await isUserBanned(userId);
  if (alreadyBanned) {
    return;
  }

  await banUser(userId);

  await sendBanNotification({
    client,
    userId,
    bannedBy: body.user.id,
  });

  logger.info(
    { userId, bannedBy: body.user.id },
    'User banned via button action'
  );
}
