import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import {
  getUserReports,
  isAdmin,
  isUserBanned,
  userReportBlocks,
} from '~/lib/reports';

export const name = 'view_reports_modal';

export async function execute({
  ack,
  body,
  view,
}: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs) {
  const adminId = body.user.id;

  if (!isAdmin(adminId)) {
    await ack({
      response_action: 'errors',
      errors: {
        user_select: 'You do not have permission to view reports.',
      },
    });
    return;
  }

  const userId = view.state.values.user_select?.user?.selected_user;

  if (!userId) {
    await ack({
      response_action: 'errors',
      errors: {
        user_select: 'Please select a user.',
      },
    });
    return;
  }

  const [userReports, isBanned] = await Promise.all([
    getUserReports(userId),
    isUserBanned(userId),
  ]);

  const blocks = userReportBlocks(userId, userReports, isBanned);

  await ack({
    response_action: 'update',
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
