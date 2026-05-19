import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { parseArgs } from './args';
import { handleClear } from './clear';
import { handleSet } from './set';
import { showMode } from './show';

export const name = 'mode';

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
): Promise<void> {
  const { ack, body, command, client, respond } = context;
  await ack();

  const channelId = body.channel_id;
  const workspaceId = body.team_id;
  const userId = body.user_id;
  const { subcommand, scope, mode, error } = parseArgs(command.text ?? '');

  if (error) {
    await respond({
      text: `${error}\nRun \`${command.command} help mode\` for help.`,
      response_type: 'ephemeral',
    });
    return;
  }

  switch (subcommand) {
    case 'set': {
      await handleSet(client, respond, body.trigger_id, {
        workspaceId,
        channelId,
        userId,
        scope: scope ?? 'channel',
        mode,
      });
      break;
    }
    case 'show': {
      await showMode(workspaceId, channelId, scope, respond);
      break;
    }
    case 'clear': {
      await handleClear(client, respond, {
        workspaceId,
        channelId,
        userId,
        scope: scope ?? 'channel',
      });
      break;
    }
    default: {
      await showMode(workspaceId, channelId, null, respond);
    }
  }
}
