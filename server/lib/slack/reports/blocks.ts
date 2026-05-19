import type { KnownBlock } from '@slack/types';
import {
  Actions,
  Button,
  type ButtonBuilder,
  Divider,
  Section,
} from 'slack-block-builder';
import type { Report } from '~/lib/kv';
import { asBlock, asBlocks } from '../blocks';

function slackDate(ms: number): string {
  return `<!date^${Math.floor(ms / 1000)}^{date_short_pretty} at {time}|${new Date(ms).toISOString()}>`;
}

function btn(
  text: string,
  actionId: string,
  options?: { value?: string; style?: 'primary' | 'danger'; url?: string }
): ButtonBuilder {
  let b = Button({ text, actionId });
  if (options?.style === 'primary') {
    b = b.primary();
  }
  if (options?.style === 'danger') {
    b = b.danger();
  }
  if (options?.value) {
    b = b.value(options.value);
  }
  if (options?.url) {
    b = b.url(options.url);
  }
  return b;
}

export function userReportBlocks(
  userId: string,
  reports: Report[],
  isBanned: boolean
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    ...asBlocks(
      Section().fields(
        `*User:*\n<@${userId}>`,
        `*Status:*\n${isBanned ? 'Banned' : 'Active'}`,
        `*Total Reports:*\n${reports.length}`
      ),
      Divider()
    ),
  ];

  if (reports.length === 0) {
    blocks.push(
      ...asBlocks(Section({ text: '_No reports found for this user._' }))
    );
  } else {
    for (const report of reports) {
      blocks.push(
        asBlock(
          Section({
            text: `*Reason:* ${report.reason}\n*Date:* ${slackDate(report.timestamp)}`,
          }).accessory(
            btn('Remove', 'remove_report', {
              style: 'danger',
              value: JSON.stringify({ userId, reportId: report.id }),
            })
          )
        )
      );
    }
  }

  blocks.push(
    ...asBlocks(
      Divider(),
      Actions().elements(
        isBanned
          ? btn('Unban User', 'unban_user', { style: 'primary', value: userId })
          : btn('Ban User', 'ban_user', { style: 'danger', value: userId })
      )
    )
  );

  return blocks;
}
