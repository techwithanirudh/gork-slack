import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { getUserReports, isUserBanned } from '~/lib/kv';
import logger from '~/lib/logger';
import { isAdmin } from '~/lib/permissions';
import { reportBlocks } from '~/slack/features/reports/blocks';
import { executeBan } from '~/slack/features/reports/utils/bans';

export const name = 'ban_user';

export async function execute(
  context: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> &
    AllMiddlewareArgs
) {
  const { ack, action, body, client } = context;

  await ack();

  if (!(await isAdmin(client, body.user.id))) {
    return;
  }

  const userId = action.value;
  if (!userId) {
    return;
  }

  await executeBan(context, userId, body.user.id);

  logger.info(
    { userId, bannedBy: body.user.id },
    'User banned via button action'
  );

  if (body.view?.id) {
    const [userReports, userIsBanned] = await Promise.all([
      getUserReports(userId),
      isUserBanned(userId),
    ]);

    await client.views.update({
      view_id: body.view.id,
      view: {
        type: 'modal',
        callback_id: 'view_reports_result',
        title: { type: 'plain_text', text: 'User Reports' },
        close: { type: 'plain_text', text: 'Close' },
        blocks: reportBlocks(userId, userReports, userIsBanned),
      },
    });
  }
}
