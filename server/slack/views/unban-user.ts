import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import logger from '~/lib/logger';
import {
  isAdmin,
  isUserBanned,
  REPORTS_CHANNEL,
  unbanUser,
} from '~/lib/reports';

export const name = 'unban_user_modal';

export async function execute({
  ack,
  body,
  view,
  client,
}: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs) {
  const adminId = body.user.id;

  if (!isAdmin(adminId)) {
    await ack({
      response_action: 'errors',
      errors: {
        user_select: 'You do not have permission to unban users.',
      },
    });
    return;
  }

  const userId = view.state.values.user_select?.user?.selected_user;

  if (!userId) {
    await ack({
      response_action: 'errors',
      errors: {
        user_select: 'Please select a user.',
      },
    });
    return;
  }

  const isBanned = await isUserBanned(userId);
  if (!isBanned) {
    await ack({
      response_action: 'errors',
      errors: {
        user_select: 'This user is not currently banned.',
      },
    });
    return;
  }

  await ack();
  await unbanUser(userId);

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
            text: `*Unbanned By:*\n<@${adminId}>`,
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

  logger.info({ userId, unbannedBy: adminId }, 'User unbanned via modal');
}
