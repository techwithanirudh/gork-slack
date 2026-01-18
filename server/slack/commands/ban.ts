import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { banUser, isAdmin, isUserBanned, REPORTS_CHANNEL } from '~/lib/reports';

const USER_ID_REGEX = /^<@([A-Z0-9]+)\|?[^>]*>$/;

function extractUserId(text: string): string | null {
  const match = text.trim().match(USER_ID_REGEX);
  return match?.[1] ?? null;
}

export async function ban({
  command,
  ack,
  respond,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs) {
  await ack();

  if (!isAdmin(command.user_id)) {
    await respond({
      response_type: 'ephemeral',
      text: 'You do not have permission to use this command.',
    });
    return;
  }

  const userId = extractUserId(command.text);

  if (!userId) {
    await respond({
      response_type: 'ephemeral',
      text: 'Please mention a user to ban. Usage: `/ban @username`',
    });
    return;
  }

  const alreadyBanned = await isUserBanned(userId);
  if (alreadyBanned) {
    await respond({
      response_type: 'ephemeral',
      text: `<@${userId}> is already banned.`,
    });
    return;
  }

  await banUser(userId);

  await respond({
    response_type: 'ephemeral',
    text: `<@${userId}> has been banned from using Gork.`,
  });

  await client.chat.postMessage({
    channel: REPORTS_CHANNEL,
    text: 'User banned by admin',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚫 Manual Ban',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Banned User:*\n<@${userId}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Banned By:*\n<@${command.user_id}>`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Unban User',
              emoji: true,
            },
            style: 'primary',
            action_id: 'unban_user',
            value: userId,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Banned at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
          },
        ],
      },
    ],
  });

  logger.info(
    { userId, bannedBy: command.user_id },
    'User banned via /ban command'
  );
}
