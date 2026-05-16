import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { banUser, isUserBanned, sendBanNotification } from '~/lib/reports';
import { isViewOwner } from './metadata';

export const name = 'ban_user_modal';

export async function execute({
  ack,
  body,
  view,
  client,
}: SlackViewMiddlewareArgs<ViewSubmitAction> &
  AllMiddlewareArgs): Promise<void> {
  const adminId = body.user.id;

  if (!isViewOwner(view.private_metadata, adminId)) {
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

  await sendBanNotification({
    client,
    userId,
    bannedBy: adminId,
  });

  logger.info({ userId, bannedBy: adminId }, 'User banned via modal');
}
