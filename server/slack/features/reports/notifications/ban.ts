import type { WebClient } from '@slack/web-api';
import { Actions, Button, Context, Header, Section } from 'slack-block-builder';
import logger from '~/lib/logger';
import { asBlocks, slackDate } from '~/lib/slack/blocks';
import { footerBlock, infoButton, sendLog, sendReport } from './shared';

export async function sendBanLog({
  client,
  userId,
}: {
  client: WebClient;
  userId: string;
}): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  await sendLog(client, `${userId} was manually banned`, [
    ...asBlocks(
      Header({ text: 'Manual Ban' }),
      Section({ text: 'A user has been manually banned from Gork.' }),
      Section().fields(`*Banned User*\n<@${userId}>`)
    ),
    infoButton('ban'),
    footerBlock(ts),
  ]);
}

export async function sendBanNotification({
  client,
  userId,
  bannedBy,
}: {
  bannedBy: string;
  client: WebClient;
  userId: string;
}): Promise<void> {
  await sendReport(
    client,
    `User <@${userId}> has been banned`,
    asBlocks(
      Header({ text: 'Manual Ban' }),
      Section().fields(
        `*Banned User:*\n<@${userId}>`,
        `*Banned By:*\n<@${bannedBy}>`
      ),
      Actions().elements(
        Button({ text: 'Unban User', actionId: 'unban_user' })
          .primary()
          .value(userId)
      ),
      Context().elements(`Banned at ${slackDate()}`)
    )
  );
  logger.info({ userId, bannedBy }, 'Ban notification sent');
}
