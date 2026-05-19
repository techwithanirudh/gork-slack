import type { WebClient } from '@slack/web-api';
import { Header, Section } from 'slack-block-builder';
import { asBlocks } from '~/lib/slack/blocks';
import { footerBlock, infoButton, sendLog } from './shared';

export async function sendStrikeLog({
  client,
  userId,
  reason,
  reportCount,
  banThreshold,
  isBanned,
}: {
  banThreshold: number;
  client: WebClient;
  isBanned: boolean;
  reason: string;
  reportCount: number;
  userId: string;
}): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  if (isBanned) {
    await sendLog(
      client,
      `${userId} auto-banned after ${reportCount} strikes`,
      [
        ...asBlocks(
          Header({ text: 'Auto-Ban' }),
          Section({
            text: 'A user has been automatically banned after hitting the strike threshold.',
          }),
          Section().fields(
            `*User*\n<@${userId}>`,
            `*Strikes*\n${reportCount}`,
            `*Last Reason*\n${reason}`
          )
        ),
        infoButton('auto_ban'),
        footerBlock(ts),
      ]
    );
  } else {
    await sendLog(
      client,
      `${userId} received a strike (${reportCount}/${banThreshold})`,
      [
        ...asBlocks(
          Header({ text: 'Strike' }),
          Section({
            text: `A user has received a strike (${reportCount}/${banThreshold} before auto-ban).`,
          }),
          Section().fields(`*User*\n<@${userId}>`, `*Reason*\n${reason}`)
        ),
        infoButton('strike'),
        footerBlock(ts),
      ]
    );
  }
}
