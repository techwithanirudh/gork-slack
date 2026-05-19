import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import type { CommandHelp } from '~/types';
import { parseArgs } from './args';

export const help: CommandHelp = {
  name: 'mode',
  description: 'Control when Gork replies in this workspace or channel.',
  subcommands: [
    {
      usage: 'mode set [workspace|channel] <mode>',
      description:
        'Set the reply mode. Omit scope to open a modal. Workspace scope requires admin.',
    },
    {
      usage: 'mode show [workspace|channel]',
      description: 'Show stored modes and the effective mode for this channel.',
    },
    {
      usage: 'mode clear <workspace|channel>',
      description: 'Clear a stored mode. Workspace scope requires admin.',
    },
  ],
  modes: [
    { name: 'ping', description: 'Only respond when directly @mentioned.' },
    {
      name: 'relevance',
      description:
        'Respond to @mentions, keywords, and AI relevance (default).',
    },
    {
      name: 'keyword',
      description: 'Respond to @mentions and keyword matches only.',
    },
    {
      name: 'none',
      description: 'Never respond in this channel. (channel only)',
    },
  ],
};

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
