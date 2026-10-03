import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import { isUserOptedOut } from '~/lib/kv';
import { isViewOwner } from '~/slack/views/metadata';
import { applyOptOut, modalNames } from '../utils';

function submit(optedOut: boolean) {
  return async ({
    ack,
    body,
    view,
    client,
  }: SlackViewMiddlewareArgs<ViewSubmitAction> &
    AllMiddlewareArgs): Promise<void> => {
    const adminId = body.user.id;

    if (!isViewOwner(view.private_metadata, adminId)) {
      await ack({
        response_action: 'errors',
        errors: {
          user_select: 'You do not have permission to change this for users.',
        },
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

    if ((await isUserOptedOut(userId)) === optedOut) {
      await ack({
        response_action: 'errors',
        errors: {
          user_select: optedOut
            ? 'This user is already opted out.'
            : 'This user is not opted out.',
        },
      });
      return;
    }

    await ack();
    await applyOptOut({
      client,
      userIds: [userId],
      optedOut,
      changedBy: adminId,
    });
  };
}

export const optOutView = { name: modalNames.optOut, execute: submit(true) };
export const optInView = { name: modalNames.optIn, execute: submit(false) };
