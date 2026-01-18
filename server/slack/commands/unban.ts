import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import {
  isAdmin,
  isUserBanned,
  REPORTS_CHANNEL,
  unbanUser,
} from '~/lib/reports';

export const name = '/unban';

const USER_ID_REGEX = /^<@([A-Z0-9]+)\|?[^>]*>$/;

function extractUserId(text: string): string | null {
  const match = text.trim().match(USER_ID_REGEX);
  return match?.[1] ?? null;
}

export async function execute({
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
      text: 'Please mention a user to unban. Usage: `/unban @username`',
    });
    return;
  }

  const isBanned = await isUserBanned(userId);
  if (!isBanned) {
    await respond({
      response_type: 'ephemeral',
      text: `<@${userId}> is not currently banned.`,
    });
    return;
  }

  await unbanUser(userId);

  await respond({
    response_type: 'ephemeral',
    text: `<@${userId}> has been unbanned and their reports have been cleared.`,
  });

  await client.chat.postMessage({
    channel: REPORTS_CHANNEL,
    text: 'User unbanned by admin',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ User Unbanned',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Unbanned User:*\n<@${userId}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Unbanned By:*\n<@${command.user_id}>`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Unbanned at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
          },
        ],
      },
    ],
  });

  logger.info(
    { userId, unbannedBy: command.user_id },
    'User unbanned via /unban command'
  );
}
