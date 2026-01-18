import type {
  ActionsBlockElement,
  KnownBlock as Block,
  Button,
} from '@slack/types';
import type { Report } from '~/lib/queries/reports';

export function header(text: string): Block {
  return {
    type: 'header',
    text: { type: 'plain_text', text, emoji: false },
  };
}

export function divider(): Block {
  return { type: 'divider' };
}

export function section(text: string): Block {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text },
  };
}

export function fields(...texts: string[]): Block {
  return {
    type: 'section',
    fields: texts.map((text) => ({ type: 'mrkdwn', text })),
  };
}

export function context(text: string): Block {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text }],
  };
}

export function actions(...elements: ActionsBlockElement[]): Block {
  return { type: 'actions', elements };
}

export function button(
  text: string,
  actionId: string,
  options?: { value?: string; style?: 'primary' | 'danger'; url?: string }
): Button {
  const btn: Button = {
    type: 'button',
    text: { type: 'plain_text', text, emoji: false },
    action_id: actionId,
  };
  if (options?.value) {
    btn.value = options.value;
  }
  if (options?.style) {
    btn.style = options.style;
  }
  if (options?.url) {
    btn.url = options.url;
  }
  return btn;
}

export function formatDate(timestamp: number): string {
  const ts = Math.floor(timestamp / 1000);
  return `<!date^${ts}^{date_short_pretty} at {time}|${new Date(timestamp).toISOString()}>`;
}

export function userMention(userId: string): string {
  return `<@${userId}>`;
}

export function channelMention(channelId: string): string {
  return `<#${channelId}>`;
}

export function userReportBlocks(
  userId: string,
  reports: Report[],
  isBanned: boolean
): Block[] {
  const blocks: Block[] = [
    fields(
      `*User:*\n${userMention(userId)}`,
      `*Status:*\n${isBanned ? 'Banned' : 'Active'}`,
      `*Total Reports:*\n${reports.length}`
    ),
    divider(),
  ];

  if (reports.length === 0) {
    blocks.push(section('_No reports found for this user._'));
  } else {
    for (const report of reports) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:* ${report.reason}\n*Date:* ${formatDate(report.timestamp)}`,
        },
        accessory: button('Remove', 'remove_report', {
          style: 'danger',
          value: JSON.stringify({ userId, reportId: report.id }),
        }),
      });
    }
  }

  blocks.push(
    divider(),
    actions(
      isBanned
        ? button('Unban User', 'unban_user', {
            style: 'primary',
            value: userId,
          })
        : button('Ban User', 'ban_user', { style: 'danger', value: userId })
    )
  );

  return blocks;
}

export function banNotificationBlocks(
  userId: string,
  bannedBy: string
): Block[] {
  return [
    header('Manual Ban'),
    fields(
      `*Banned User:*\n${userMention(userId)}`,
      `*Banned By:*\n${userMention(bannedBy)}`
    ),
    actions(
      button('Unban User', 'unban_user', { style: 'primary', value: userId })
    ),
    context(`Banned at ${formatDate(Date.now())}`),
  ];
}

export function unbanNotificationBlocks(
  userId: string,
  unbannedBy: string
): Block[] {
  return [
    header('User Unbanned'),
    fields(
      `*Unbanned User:*\n${userMention(userId)}`,
      `*Unbanned By:*\n${userMention(unbannedBy)}`
    ),
    actions(button('Ban User', 'ban_user', { style: 'danger', value: userId })),
    context(`Unbanned at ${formatDate(Date.now())}`),
  ];
}

export function reportNotificationBlocks(
  userId: string,
  channelId: string,
  reason: string,
  reportCount: number,
  isBanned: boolean,
  messageLink?: string
): Block[] {
  const actionButtons: ActionsBlockElement[] = [];

  if (messageLink) {
    actionButtons.push(
      button('View Message', 'view_reported_message', { url: messageLink })
    );
  }

  actionButtons.push(
    isBanned
      ? button('Unban User', 'unban_user', { style: 'primary', value: userId })
      : button('Ban User', 'ban_user', { style: 'danger', value: userId })
  );

  return [
    header(isBanned ? 'User Banned' : 'New Report'),
    fields(
      `*Reported User:*\n${userMention(userId)}`,
      `*Report Count:*\n${reportCount}`,
      `*Channel:*\n${channelMention(channelId)}`,
      `*Status:*\n${isBanned ? 'Banned' : 'Warned'}`
    ),
    section(`*Reason:*\n${reason}`),
    actions(...actionButtons),
    context(`Report submitted at ${formatDate(Date.now())}`),
  ];
}
