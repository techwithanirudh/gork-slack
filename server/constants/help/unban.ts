import type { CommandHelp } from '~/types';

export const unban: CommandHelp = {
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
