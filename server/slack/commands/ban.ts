import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { isAdmin } from '~/lib/reports';
import { executeBan } from '~/lib/slack/bans';
import { respondWithPermissionError } from '~/lib/slack/errors';
import { parseUserList } from '~/utils/users';

export const name = 'ban';

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, client, command, respond } = context;

  const adminId = body.user_id;

  await ack();

  if (!isAdmin(adminId)) {
    await respondWithPermissionError(context);
    return;
  }

  if (command.text) {
    const userList = parseUserList(command.text);

    const results: Awaited<ReturnType<typeof executeBan>>[] = [];
    for (const userId of userList) {
      results.push(await executeBan(context, userId, adminId));
    }

    await respond({
      text: `${results.length} ban(s) processed. \n${results.map((result, i) => `<@${userList[i]}>: ${result}`).join('\n')}`,
      response_type: 'ephemeral',
    });

    return;
  }

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'ban_user_modal',
      title: {
        type: 'plain_text',
        text: 'Ban User',
      },
      submit: {
        type: 'plain_text',
        text: 'Ban',
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
              text: 'Select a user to ban',
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
