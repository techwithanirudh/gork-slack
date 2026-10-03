import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import type { CommandHelp } from '~/types';
import { executeOptOut } from '../utils';

export const name = 'optout';

export const help: CommandHelp = {
  name: 'optout',
  description:
    "Stop Gork reading your messages, including when someone else talks to it in a channel or thread you're in.",
  subcommands: [
    {
      usage: 'optout',
      description:
        'Opt yourself out. Your messages are hidden from Gork everywhere until you opt back in.',
    },
    {
      usage: 'optout [@user ...]',
      description: 'Opt one or more other people out.',
      permissions: ['admin'],
    },
  ],
};

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  await executeOptOut(context, true);
}
