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

function banNotificationBlocks(userId: string, bannedBy: string): KnownBlock[] {
  return asBlocks(
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
  );
}

interface BanLogParams {
  client: WebClient;
  userId: string;
}

export async function sendBanLog({
  client,
  userId,
}: BanLogParams): Promise<void> {
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

interface BanNotificationParams {
  bannedBy: string;
  client: WebClient;
  userId: string;
}

export async function sendBanNotification({
  client,
  userId,
  bannedBy,
}: BanNotificationParams): Promise<void> {
  await sendReport(
    client,
    `User <@${userId}> has been banned`,
    banNotificationBlocks(userId, bannedBy)
  );
  logger.info({ userId, bannedBy }, 'Ban notification sent');
}
