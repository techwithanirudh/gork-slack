import type { WebClient } from '@slack/web-api';
import { Actions, Button, Context, Header, Section } from 'slack-block-builder';
import logger from '~/lib/logger';
import { asBlocks, slackDate } from '~/lib/slack/blocks';
import { footerBlock, infoButton, sendLog, sendReport } from './shared';

export async function sendUnbanLog({
  client,
  userId,
}: {
  client: WebClient;
  userId: string;
}): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  await sendLog(client, `${userId} was unbanned`, [
    ...asBlocks(
      Header({ text: 'Unban' }),
      Section({ text: 'A user has been unbanned and can use Gork again.' }),
      Section().fields(`*User*\n<@${userId}>`)
    ),
    infoButton('unban'),
    footerBlock(ts),
  ]);
}

export async function sendUnbanNotification({
  client,
  userId,
  unbannedBy,
}: {
  client: WebClient;
  unbannedBy: string;
  userId: string;
}): Promise<void> {
  await sendReport(
    client,
    `User <@${userId}> has been unbanned`,
    asBlocks(
      Header({ text: 'User Unbanned' }),
      Section().fields(
        `*Unbanned User:*\n<@${userId}>`,
        `*Unbanned By:*\n<@${unbannedBy}>`
      ),
      Actions().elements(
        Button({ text: 'Ban User', actionId: 'ban_user' })
          .danger()
          .value(userId)
      ),
      Context().elements(`Unbanned at ${slackDate()}`)
    )
  );
  logger.info({ userId, unbannedBy }, 'Unban notification sent');
}
