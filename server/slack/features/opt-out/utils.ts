import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import type { WebClient } from '@slack/web-api';
import { Input, UserSelect } from 'slack-block-builder';
import { setOptedOut } from '~/lib/kv';
import logger from '~/lib/logger';
import { isAdmin } from '~/lib/permissions';
import { asBlocks } from '~/lib/slack/blocks';
import { respondWithPermissionError } from '~/lib/slack/errors';
import { parseUserList } from '~/utils/users';
import { sendOptOutNotifications } from './notifications';

export const modalNames = {
  optIn: 'opt_in_user_modal',
  optOut: 'opt_out_user_modal',
};

const mention = (userIds: string[]) =>
  userIds.map((userId) => `<@${userId}>`).join(', ');

// Every path (command, modal, reports button) goes through here, so the logs
// and reports channels hear about every change. Returns the ids that changed.
export async function applyOptOut({
  client,
  userIds,
  optedOut,
  changedBy,
}: {
  changedBy: string;
  client: WebClient;
  optedOut: boolean;
  userIds: string[];
}): Promise<string[]> {
  const changed = await setOptedOut(userIds, optedOut);
  if (changed.length === 0) {
    return changed;
  }
  await Promise.all(
    changed.map((userId) =>
      sendOptOutNotifications({ client, userId, changedBy, optedOut })
    )
  );
  logger.info(
    { userIds: changed, changedBy },
    optedOut ? 'Users opted out' : 'Users opted back in'
  );
  return changed;
}

export async function executeOptOut(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs,
  optedOut: boolean
) {
  const { ack, body, client, command, respond } = context;

  await ack();

  const requesterId = body.user_id;
  const named = parseUserList(command.text ?? '');
  const admin = await isAdmin(client, requesterId);

  if (named.length > 0 && !admin) {
    await respondWithPermissionError(context);
    return;
  }

  // Admins with no users named get the same picker the ban command opens.
  if (named.length === 0 && admin) {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: optedOut ? modalNames.optOut : modalNames.optIn,
        private_metadata: JSON.stringify({ openedBy: requesterId }),
        title: {
          type: 'plain_text',
          text: optedOut ? 'Opt Out User' : 'Opt In User',
        },
        submit: { type: 'plain_text', text: optedOut ? 'Opt Out' : 'Opt In' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: asBlocks(
          Input({ blockId: 'user_select', label: 'User' }).element(
            UserSelect({
              actionId: 'user',
              initialUser: requesterId,
              placeholder: optedOut
                ? 'Select a user to opt out'
                : 'Select a user to opt back in',
            })
          )
        ),
      },
    });
    return;
  }

  const userIds = named.length > 0 ? named : [requesterId];
  const changed = await applyOptOut({
    client,
    userIds,
    optedOut,
    changedBy: requesterId,
  });

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
