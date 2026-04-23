import type { KnownBlock } from '@slack/types';
import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import logger from '~/lib/logger';

function infoButton(value: string): KnownBlock {
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        action_id: 'moderation_info',
        text: { type: 'plain_text', text: 'More Info' },
        value,
      },
    ],
  };
}

function footerBlock(ts: number): KnownBlock {
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `<!date^${ts}^{date_long_pretty} at {time}|${new Date(ts * 1000).toUTCString()}>`,
      },
    ],
  };
}

async function postLog(
  client: WebClient,
  text: string,
  blocks?: KnownBlock[]
): Promise<void> {
  if (!(env.LOGS_CHANNEL && env.BAN_LOGS)) {
    return;
  }
  try {
    await client.chat.postMessage({ channel: env.LOGS_CHANNEL, text, blocks });
  } catch (error) {
    logger.warn({ error }, 'Failed to post to logs channel');
  }
}

interface StrikeLogParams {
  banThreshold: number;
  client: WebClient;
  isBanned: boolean;
  reason: string;
  reportCount: number;
  userId: string;
}

export async function sendStrikeLog({
  client,
  userId,
  reason,
  reportCount,
  banThreshold,
  isBanned,
}: StrikeLogParams): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);

  if (isBanned) {
    await postLog(
      client,
      `${userId} auto-banned after ${reportCount} strikes`,
      [
        { type: 'header', text: { type: 'plain_text', text: 'Auto-Ban' } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'A user has been automatically banned after hitting the strike threshold.',
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*User*\n<@${userId}>` },
            { type: 'mrkdwn', text: `*Strikes*\n${reportCount}` },
            { type: 'mrkdwn', text: `*Last Reason*\n${reason}` },
          ],
        },
        infoButton('auto_ban'),
        footerBlock(ts),
      ]
    );
  } else {
    await postLog(
      client,
      `${userId} received a strike (${reportCount}/${banThreshold})`,
      [
        { type: 'header', text: { type: 'plain_text', text: 'Strike' } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `A user has received a strike (${reportCount}/${banThreshold} before auto-ban).`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*User*\n<@${userId}>` },
            { type: 'mrkdwn', text: `*Reason*\n${reason}` },
          ],
        },
        infoButton('strike'),
        footerBlock(ts),
      ]
    );
  }
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
  await postLog(client, `${userId} was manually banned`, [
    { type: 'header', text: { type: 'plain_text', text: 'Manual Ban' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'A user has been manually banned from Gork.',
      },
    },
    {
      type: 'section',
      fields: [{ type: 'mrkdwn', text: `*Banned User*\n<@${userId}>` }],
    },
    infoButton('ban'),
    footerBlock(ts),
  ]);
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
  await postLog(client, `${userId} was unbanned`, [
    { type: 'header', text: { type: 'plain_text', text: 'Unban' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'A user has been unbanned and can use Gork again.',
      },
    },
    {
      type: 'section',
      fields: [{ type: 'mrkdwn', text: `*User*\n<@${userId}>` }],
    },
    infoButton('unban'),
    footerBlock(ts),
  ]);
}
