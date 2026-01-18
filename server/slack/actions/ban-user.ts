import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { banUser, isAdmin, isUserBanned } from '~/lib/reports';

export const name = 'ban_user';

export async function execute({
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

  const alreadyBanned = await isUserBanned(userId);
  if (alreadyBanned) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: `<@${userId}> is already banned.`,
    });
    return;
  }

  await banUser(userId);

  await respond({
    response_type: 'ephemeral',
    replace_original: false,
    text: `<@${userId}> has been banned by <@${body.user.id}>.`,
  });

  logger.info(
    { userId, bannedBy: body.user.id },
    'User banned via button action'
  );
}
