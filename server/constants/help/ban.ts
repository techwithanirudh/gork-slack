import type { CommandHelp } from '~/types';

export const ban: CommandHelp = {
  name: 'ban',
  description: 'Ban a user from interacting with Gork.',
  subcommands: [
    {
      usage: 'ban [@user ...]',
      description:
        'Ban one or more users. Opens a picker modal if no users specified.',
      permissions: ['admin'],
    },
  ],
};
