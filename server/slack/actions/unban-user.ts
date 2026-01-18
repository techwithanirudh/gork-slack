import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { isAdmin, isUserBanned, unbanUser } from '~/lib/reports';

export async function unbanUserAction({
  ack,
  action,
  respond,
  body,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs) {
  await ack();

  if (!isAdmin(body.user.id)) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'You do not have permission to perform this action.',
    });
    return;
  }

  const userId = action.value;

  if (!userId) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'Error: No user ID provided.',
    });
    return;
  }

  const isBanned = await isUserBanned(userId);
  if (!isBanned) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: `<@${userId}> is not currently banned.`,
    });
    return;
  }

  await unbanUser(userId);

  await respond({
    response_type: 'ephemeral',
    replace_original: false,
    text: `<@${userId}> has been unbanned by <@${body.user.id}>. Reports have been cleared.`,
  });

  logger.info(
    { userId, unbannedBy: body.user.id },
    'User unbanned via button action'
  );
}
