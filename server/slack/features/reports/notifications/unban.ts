import type { KnownBlock } from '@slack/types';
import type { WebClient } from '@slack/web-api';
import { Actions, Button, Context, Header, Section } from 'slack-block-builder';
import logger from '~/lib/logger';
import { asBlocks } from '~/lib/slack/blocks';
import {
  footerBlock,
  infoButton,
  sendLog,
  sendReport,
  slackDate,
} from './shared';

function unbanNotificationBlocks(
  userId: string,
  unbannedBy: string
): KnownBlock[] {
  return asBlocks(
    Header({ text: 'User Unbanned' }),
    Section().fields(
      `*Unbanned User:*\n<@${userId}>`,
      `*Unbanned By:*\n<@${unbannedBy}>`
    ),
    Actions().elements(
      Button({ text: 'Ban User', actionId: 'ban_user' }).danger().value(userId)
    ),
    Context().elements(`Unbanned at ${slackDate()}`)
  );
}

interface UnbanLogParams {
  client: WebClient;
  userId: string;
}

export async function sendUnbanLog({
  client,
  userId,
}: UnbanLogParams): Promise<void> {
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

interface UnbanNotificationParams {
  client: WebClient;
  unbannedBy: string;
  userId: string;
}

export async function sendUnbanNotification({
  client,
  userId,
  unbannedBy,
}: UnbanNotificationParams): Promise<void> {
  await sendReport(
    client,
    `User <@${userId}> has been unbanned`,
    unbanNotificationBlocks(userId, unbannedBy)
  );
  logger.info({ userId, unbannedBy }, 'Unban notification sent');
}
