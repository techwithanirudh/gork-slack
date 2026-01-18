import type { SlackCommandMiddlewareArgs } from '@slack/bolt';
import type { Report } from '~/lib/reports';
import { getUserReports, isAdmin, isUserBanned } from '~/lib/reports';

export const name = 'reports';

const USER_ID_REGEX = /^<@([A-Z0-9]+)\|?[^>]*>$/;

function extractUserId(text: string): string | null {
  const match = text.trim().match(USER_ID_REGEX);
  return match?.[1] ?? null;
}

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
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📋 Reports for User',
        emoji: true,
      },
    },
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
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs) {
  await ack();

  if (!isAdmin(command.user_id)) {
    await respond({
      response_type: 'ephemeral',
      text: 'You do not have permission to use this command.',
    });
    return;
  }

  const userId = extractUserId(command.text);

  if (!userId) {
    await respond({
      response_type: 'ephemeral',
      text: 'Please mention a user to view their reports. Usage: `/reports @username`',
    });
    return;
  }

  const [userReports, isBanned] = await Promise.all([
    getUserReports(userId),
    isUserBanned(userId),
  ]);

  const blocks = buildReportBlocks(userId, userReports, isBanned);

  await respond({
    response_type: 'ephemeral',
    text: `Reports for <@${userId}>`,
    // biome-ignore lint/suspicious/noExplicitAny: Slack block types are complex
    blocks: blocks as any,
  });
}
