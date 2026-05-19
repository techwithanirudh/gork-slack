import type { KnownBlock } from '@slack/types';
import type { WebClient } from '@slack/web-api';
import {
  Actions,
  Button,
  type ButtonBuilder,
  Context,
  Divider,
  Header,
  Section,
} from 'slack-block-builder';
import { env } from '~/env';
import logger from '~/lib/logger';
import { asBlock, asBlocks } from '../blocks';

function slackDate(ms = Date.now()): string {
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

function infoButton(value: string) {
  return asBlock(
    Actions().elements(
      Button({ text: 'More Info', actionId: 'moderation_info' }).value(value)
    )
  );
}

function footerBlock(ts: number) {
  return asBlock(
    Context().elements(
      `<!date^${ts}^{date_long_pretty} at {time}|${new Date(ts * 1000).toUTCString()}>`
    )
  );
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

function banNotificationBlocks(userId: string, bannedBy: string): KnownBlock[] {
  return asBlocks(
    Header({ text: 'Manual Ban' }),
    Section().fields(
      `*Banned User:*\n<@${userId}>`,
      `*Banned By:*\n<@${bannedBy}>`
    ),
    Actions().elements(
      btn('Unban User', 'unban_user', { style: 'primary', value: userId })
    ),
    Context().elements(`Banned at ${slackDate()}`)
  );
}

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
      btn('Ban User', 'ban_user', { style: 'danger', value: userId })
    ),
    Context().elements(`Unbanned at ${slackDate()}`)
  );
}

function reportNotificationBlocks(
  userId: string,
  channelId: string,
  reason: string,
  reportCount: number,
  isBanned: boolean,
  messageLink?: string,
  messageContext?: string[],
  isPrivateChannel?: boolean
): KnownBlock[] {
  const actionButtons: ButtonBuilder[] = [];
  if (messageLink) {
    actionButtons.push(
      btn('View Message', 'view_reported_message', { url: messageLink })
    );
  }
  actionButtons.push(
    isBanned
      ? btn('Unban User', 'unban_user', { style: 'primary', value: userId })
      : btn('Ban User', 'ban_user', { style: 'danger', value: userId })
  );

  const blocks: KnownBlock[] = asBlocks(
    Header({ text: isBanned ? 'User Banned' : 'New Report' }),
    Section().fields(
      `*Reported User:*\n<@${userId}>`,
      `*Report Count:*\n${reportCount}`,
      `*Channel:*\n<#${channelId}>`,
      `*Status:*\n${isBanned ? 'Banned' : 'Warned'}`
    )
  );

  if (isPrivateChannel) {
    blocks.push(
      ...asBlocks(
        Context().elements(
          ':warning: This report is from a private channel. You may not have access to view the original message.'
        )
      )
    );
  }

  blocks.push(...asBlocks(Section({ text: `*Reason:*\n${reason}` })));

  if (messageContext && messageContext.length > 0) {
    const formattedMessages = messageContext
      .map((msg) => (msg.length > 300 ? `${msg.slice(0, 300)}...` : msg))
      .map((msg, i) =>
        i === messageContext.length - 1 ? `:arrow_right: ${msg}` : msg
      )
      .join('\n\n');
    blocks.push(
      ...asBlocks(
        Divider(),
        Section({ text: `*Recent Messages from User:*\n${formattedMessages}` })
      )
    );
  }

  blocks.push(
    ...asBlocks(
      Actions().elements(...actionButtons),
      Context().elements(`Report submitted at ${slackDate()}`)
    )
  );

  return blocks;
}

// --- strike / ban / unban logs ---

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
    await postLog(
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
    ...asBlocks(
      Header({ text: 'Manual Ban' }),
      Section({ text: 'A user has been manually banned from Gork.' }),
      Section().fields(`*Banned User*\n<@${userId}>`)
    ),
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
    ...asBlocks(
      Header({ text: 'Unban' }),
      Section({ text: 'A user has been unbanned and can use Gork again.' }),
      Section().fields(`*User*\n<@${userId}>`)
    ),
    infoButton('unban'),
    footerBlock(ts),
  ]);
}

// --- report / ban / unban notifications ---

interface ReportNotificationParams {
  channelId: string;
  client: WebClient;
  isBanned: boolean;
  messageContext?: string[];
  messageTs: string;
  reason: string;
  reportCount: number;
  userId: string;
}

export async function sendReportNotification({
  client,
  userId,
  channelId,
  messageTs,
  reason,
  reportCount,
  isBanned,
  messageContext,
}: ReportNotificationParams): Promise<void> {
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Report notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }

  let isPrivateChannel = false;
  try {
    const channelInfo = await client.conversations.info({ channel: channelId });
    isPrivateChannel =
      channelInfo.channel?.is_private ??
      channelInfo.channel?.is_group ??
      channelInfo.channel?.is_mpim ??
      false;
  } catch {
    isPrivateChannel = true;
  }

  let permalink: string | undefined;
  try {
    const result = await client.chat.getPermalink({
      channel: channelId,
      message_ts: messageTs,
    });
    permalink = result.permalink ?? undefined;
  } catch (error) {
    logger.warn(
      { error, channelId, messageTs },
      'Failed to get permalink for reported message'
    );
  }

  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been reported`,
    blocks: reportNotificationBlocks(
      userId,
      channelId,
      reason,
      reportCount,
      isBanned,
      permalink,
      messageContext,
      isPrivateChannel
    ),
  });

  logger.info(
    { userId, channelId, reportCount, isBanned },
    'Report notification sent'
  );
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
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Ban notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }
  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been banned`,
    blocks: banNotificationBlocks(userId, bannedBy),
  });
  logger.info({ userId, bannedBy }, 'Ban notification sent');
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
  if (!env.REPORTS_CHANNEL) {
    logger.warn(
      'Unban notification not sent because REPORTS_CHANNEL is not configured'
    );
    return;
  }
  await client.chat.postMessage({
    channel: env.REPORTS_CHANNEL,
    text: `User <@${userId}> has been unbanned`,
    blocks: unbanNotificationBlocks(userId, unbannedBy),
  });
  logger.info({ userId, unbannedBy }, 'Unban notification sent');
}
