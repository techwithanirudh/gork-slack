import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import { isUserBanned, unbanUser } from '~/lib/kv';
import logger from '~/lib/logger';
import { sendUnbanNotification } from '~/slack/features/reports/notifications';
import { isViewOwner } from '~/slack/views/metadata';

export const name = 'unban_user_modal';

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
      errors: { user_select: 'You do not have permission to unban users.' },
    });
    return;
  }

  const userId = view.state.values.user_select?.user?.selected_user;

  if (!userId) {
    await ack({
      response_action: 'errors',
      errors: { user_select: 'Please select a user.' },
    });
    return;
  }

  const isBanned = await isUserBanned(userId);
  if (!isBanned) {
    await ack({
      response_action: 'errors',
      errors: { user_select: 'This user is not currently banned.' },
    });
    return;
  }

  await ack();
  await unbanUser(userId);
  await sendUnbanNotification({ client, userId, unbannedBy: adminId });

  logger.info({ userId, unbannedBy: adminId }, 'User unbanned via modal');
}
