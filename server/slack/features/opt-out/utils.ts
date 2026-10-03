import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { setOptedOut } from '~/lib/kv';
import { isAdmin } from '~/lib/permissions';
import { respondWithPermissionError } from '~/lib/slack/errors';
import { parseUserList } from '~/utils/users';

const mention = (userIds: string[]) =>
  userIds.map((userId) => `<@${userId}>`).join(', ');

export async function executeOptOut(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs,
  optedOut: boolean
) {
  const { ack, body, client, command, respond } = context;

  await ack();

  const requesterId = body.user_id;
  const named = parseUserList(command.text ?? '');

  if (named.length > 0 && !(await isAdmin(client, requesterId))) {
    await respondWithPermissionError(context);
    return;
  }

  const userIds = named.length > 0 ? named : [requesterId];
  const changed = await setOptedOut(userIds, optedOut);

  if (named.length === 0) {
    await respond({
      text: optedOut
        ? `You're opted out. Gork won't read your messages anymore: it won't reply to you, and when someone else talks to it, your messages show up only as a hidden placeholder. Run \`${command.command} optin\` to undo.`
        : "You're opted back in. Gork can read your messages again.",
      response_type: 'ephemeral',
    });
    return;
  }

  const unchanged = userIds.filter((userId) => !changed.includes(userId));
  await respond({
    text: [
      changed.length > 0
        ? `${optedOut ? 'Opted out' : 'Opted back in'}: ${mention(changed)}`
        : null,
      unchanged.length > 0
        ? `Already ${optedOut ? 'opted out' : 'opted in'}: ${mention(unchanged)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
    response_type: 'ephemeral',
  });
}
