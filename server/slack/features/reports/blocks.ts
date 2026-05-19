import type { KnownBlock } from '@slack/types';
import { Actions, Button, Divider, Section } from 'slack-block-builder';
import type { Report } from '~/lib/kv';
import { asBlock, asBlocks, slackDate } from '~/lib/slack/blocks';

export function reportBlocks(
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
            Button({ text: 'Remove', actionId: 'remove_report' })
              .danger()
              .value(JSON.stringify({ userId, reportId: report.id }))
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
          ? Button({ text: 'Unban User', actionId: 'unban_user' })
              .primary()
              .value(userId)
          : Button({ text: 'Ban User', actionId: 'ban_user' })
              .danger()
              .value(userId)
      )
    )
  );

  return blocks;
}
