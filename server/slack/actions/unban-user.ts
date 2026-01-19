import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import {
  getUserReports,
  isAdmin,
  isUserBanned,
  userReportBlocks,
} from '~/lib/reports';
import { executeUnban } from '~/lib/slack/bans';

export const name = 'unban_user';

export async function execute(
  context: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> &
    AllMiddlewareArgs
) {
  const { ack, action, body, client } = context;

  await ack();

  if (!isAdmin(body.user.id)) {
    return;
  }

  const userId = action.value;

  if (!userId) {
    return;
  }

  await executeUnban(context, userId, body.user.id);

  logger.info(
    { userId, unbannedBy: body.user.id },
    'User unbanned via button action'
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
