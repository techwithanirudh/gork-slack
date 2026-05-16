import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { getUserReports, isUserBanned, userReportBlocks } from '~/lib/reports';
import { section } from '~/lib/slack/blocks';
import { isViewOwner } from './metadata';

export const name = 'view_reports_modal';

export async function execute({
  ack,
  body,
  view,
}: SlackViewMiddlewareArgs<ViewSubmitAction> &
  AllMiddlewareArgs): Promise<void> {
  const adminId = body.user.id;

  if (!isViewOwner(view.private_metadata, adminId)) {
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

  try {
    const [userReports, isBanned] = await Promise.all([
      getUserReports(userId),
      isUserBanned(userId),
    ]);

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
        blocks: userReportBlocks(userId, userReports, isBanned),
      },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to load reports from modal');
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
        blocks: [section('failed to load reports. try again in a bit')],
      },
    });
  }
}
