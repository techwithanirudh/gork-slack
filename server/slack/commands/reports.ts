import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { isAdmin } from '~/lib/reports';

export const name = 'reports';

export async function execute({
  ack,
  body,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs) {
  const adminId = body.user_id;

  if (!isAdmin(adminId)) {
    await ack();
    await respond({
      text: 'You do not have permission for this command.',
      response_type: 'ephemeral',
    });
    return;
  }

  await ack();

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'view_reports_modal',
      title: {
        type: 'plain_text',
        text: 'View Reports',
      },
      submit: {
        type: 'plain_text',
        text: 'View',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'user_select',
          element: {
            type: 'users_select',
            action_id: 'user',
            placeholder: {
              type: 'plain_text',
              text: 'Select a user to view reports',
            },
          },
          label: {
            type: 'plain_text',
            text: 'User',
          },
        },
      ],
    },
  });
}
