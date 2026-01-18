import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import {
  banUser,
  getUserReports,
  isAdmin,
  isUserBanned,
  sendBanNotification,
  userReportBlocks,
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

  if (body.view?.id) {
    const [userReports, userIsBanned] = await Promise.all([
      getUserReports(userId),
      isUserBanned(userId),
    ]);

    const blocks = userReportBlocks(userId, userReports, userIsBanned);

    await client.views.update({
      view_id: body.view.id,
      view: {
        type: 'modal',
        callback_id: 'view_reports_result',
        title: {
          type: 'plain_text',
          text: 'User Reports',
        },
        close: {
          type: 'plain_text',
          text: 'Close',
        },
        blocks,
      },
    });
  }
}
