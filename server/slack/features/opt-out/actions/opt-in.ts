import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { isAdmin } from '~/lib/permissions';
import { applyOptOut } from '../utils';

// The "Opt In User" button on the reports channel post.
export const name = 'opt_in_user';

export async function execute({
  ack,
  action,
  body,
  client,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs) {
  await ack();

  if (!(await isAdmin(client, body.user.id))) {
    return;
  }

  const userId = action.value;
  if (!userId) {
    return;
  }

  await applyOptOut({
    client,
    userIds: [userId],
    optedOut: false,
    changedBy: body.user.id,
  });
}
