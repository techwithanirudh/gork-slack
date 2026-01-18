import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import type { Report } from '~/lib/reports';
import { getUserReports, isAdmin, isUserBanned } from '~/lib/reports';

export const name = 'view_reports_modal';

function formatReportDate(timestamp: number): string {
  return `<!date^${Math.floor(timestamp / 1000)}^{date_short_pretty} at {time}|${new Date(timestamp).toISOString()}>`;
}

function buildReportBlocks(
  userId: string,
  reports: Report[],
  isBanned: boolean
) {
  const blocks: object[] = [
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*User:*\n<@${userId}>`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${isBanned ? '🚫 Banned' : '✅ Active'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Total Reports:*\n${reports.length}`,
        },
      ],
    },
    {
      type: 'divider',
    },
  ];

  if (reports.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_No reports found for this user._',
      },
    });
  } else {
    for (const report of reports) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:* ${report.reason}\n*Date:* ${formatReportDate(report.timestamp)}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🗑️ Remove',
            emoji: true,
          },
          style: 'danger',
          action_id: 'remove_report',
          value: JSON.stringify({ userId, reportId: report.id }),
        },
      });
    }
  }

  if (isBanned) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Unban User',
              emoji: true,
            },
            style: 'primary',
            action_id: 'unban_user',
            value: userId,
          },
        ],
      }
    );
  }

  return blocks;
}

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

  const blocks = buildReportBlocks(userId, userReports, isBanned);

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
