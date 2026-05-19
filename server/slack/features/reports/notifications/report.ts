import type { WebClient } from '@slack/web-api';
import {
  Actions,
  Button,
  Context,
  Divider,
  Header,
  Section,
} from 'slack-block-builder';
import logger from '~/lib/logger';
import { asBlocks, slackDate } from '~/lib/slack/blocks';
import { footerBlock, infoButton, sendLog, sendReport } from './shared';

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

export async function sendReportNotification({
  client,
  userId,
  channelId,
  messageTs,
  reason,
  reportCount,
  isBanned,
  messageContext,
}: {
  channelId: string;
  client: WebClient;
  isBanned: boolean;
  messageContext?: string[];
  messageTs: string;
  reason: string;
  reportCount: number;
  userId: string;
}): Promise<void> {
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

  const actionButtons = [
    ...(permalink
      ? [
          Button({
            text: 'View Message',
            actionId: 'view_reported_message',
          }).url(permalink),
        ]
      : []),
    isBanned
      ? Button({ text: 'Unban User', actionId: 'unban_user' })
          .primary()
          .value(userId)
      : Button({ text: 'Ban User', actionId: 'ban_user' })
          .danger()
          .value(userId),
  ];

  const blocks = asBlocks(
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

  await sendReport(client, `User <@${userId}> has been reported`, blocks);

  logger.info(
    { userId, channelId, reportCount, isBanned },
    'Report notification sent'
  );
}
