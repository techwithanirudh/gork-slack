import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { Input, UserSelect } from 'slack-block-builder';
import { isAdmin } from '~/lib/permissions';
import { asBlocks } from '~/lib/slack/blocks';
import { respondWithPermissionError } from '~/lib/slack/errors';
import type { CommandHelp } from '~/types';

export const name = 'reports';

export const help: CommandHelp = {
  name: 'reports',
  description: 'View reports filed against a user.',
  subcommands: [
    {
      usage: 'reports',
      description: 'Opens a modal to view reports for a selected user.',
      permissions: ['admin'],
    },
  ],
};

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, client } = context;

  const adminId = body.user_id;

  await ack();

  if (!(await isAdmin(client, adminId))) {
    await respondWithPermissionError(context);
    return;
  }

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'view_reports_modal',
      private_metadata: JSON.stringify({ openedBy: adminId }),
      title: { type: 'plain_text', text: 'View Reports' },
      submit: { type: 'plain_text', text: 'View' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: asBlocks(
        Input({ blockId: 'user_select', label: 'User' }).element(
          UserSelect({
            actionId: 'user',
            placeholder: 'Select a user to view reports',
          })
        )
      ),
    },
  });
}
