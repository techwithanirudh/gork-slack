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
  removeReport,
  userReportBlocks,
} from '~/lib/reports';

export const name = 'remove_report';

interface RemoveReportValue {
  userId: string;
  reportId: string;
}

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

  const valueStr = action.value;

  if (!valueStr) {
    return;
  }

  let value: RemoveReportValue;
  try {
    value = JSON.parse(valueStr);
  } catch {
    return;
  }

  const removed = await removeReport(value.userId, value.reportId);

  if (!removed) {
    return;
  }

  logger.info(
    { userId: value.userId, reportId: value.reportId, removedBy: body.user.id },
    'Report removed via button action'
  );

  if (body.view?.id) {
    const [userReports, isBanned] = await Promise.all([
      getUserReports(value.userId),
      isUserBanned(value.userId),
    ]);

    const blocks = userReportBlocks(value.userId, userReports, isBanned);

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
        // biome-ignore lint/suspicious/noExplicitAny: Slack block types
        blocks: blocks as any,
      },
    });
  }
}
