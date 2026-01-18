import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { banUser, isAdmin, isUserBanned, REPORTS_CHANNEL } from '~/lib/reports';

export const name = 'ban_user_modal';

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
        user_select: 'You do not have permission to ban users.',
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

  const alreadyBanned = await isUserBanned(userId);
  if (alreadyBanned) {
    await ack({
      response_action: 'errors',
      errors: {
        user_select: 'This user is already banned.',
      },
    });
    return;
  }

  await ack();
  await banUser(userId);

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
            text: `*Banned By:*\n<@${adminId}>`,
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

  logger.info({ userId, bannedBy: adminId }, 'User banned via modal');
}
