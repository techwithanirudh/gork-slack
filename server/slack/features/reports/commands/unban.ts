import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { Input, UserSelect } from 'slack-block-builder';
import { isAdmin } from '~/lib/permissions';
import { asBlocks } from '~/lib/slack/blocks';
import { respondWithPermissionError } from '~/lib/slack/errors';
import { executeUnban } from '~/slack/features/reports/utils/bans';
import type { CommandHelp } from '~/types';
import { parseUserList } from '~/utils/users';

export const name = 'unban';

export const help: CommandHelp = {
  name: 'unban',
  description: 'Unban a previously banned user.',
  subcommands: [
    {
      usage: 'unban [@user ...]',
      description:
        'Unban one or more users. Opens a picker modal if no users specified.',
      permissions: ['admin'],
    },
  ],
};

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, client, command, respond } = context;

  const adminId = body.user_id;

  await ack();

  if (!(await isAdmin(client, adminId))) {
    await respondWithPermissionError(context);
    return;
  }

  if (command.text) {
    const userList = parseUserList(command.text);

    const results: Awaited<ReturnType<typeof executeUnban>>[] = [];
    for (const userId of userList) {
      results.push(await executeUnban(context, userId, adminId));
    }

    await respond({
      text: `${results.length} unban(s) processed. \n${results.map((result, i) => `<@${userList[i]}>: ${result}`).join('\n')}`,
      response_type: 'ephemeral',
    });

    return;
  }

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'unban_user_modal',
      private_metadata: JSON.stringify({ openedBy: adminId }),
      title: { type: 'plain_text', text: 'Unban User' },
      submit: { type: 'plain_text', text: 'Unban' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: asBlocks(
        Input({ blockId: 'user_select', label: 'User' }).element(
          UserSelect({
            actionId: 'user',
            placeholder: 'Select a user to unban',
          })
        )
      ),
    },
  });
}
