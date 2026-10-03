import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import type { CommandHelp } from '~/types';
import { executeOptOut } from '../utils';

export const name = 'optin';

export const help: CommandHelp = {
  name: 'optin',
  description: 'Undo `optout` so Gork can read your messages again.',
  subcommands: [
    { usage: 'optin', description: 'Opt yourself back in.' },
    {
      usage: 'optin [@user ...]',
      description: 'Opt one or more other people back in.',
      permissions: ['admin'],
    },
  ],
};

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  await executeOptOut(context, false);
}
