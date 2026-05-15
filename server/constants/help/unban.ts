import type { CommandHelp } from '~/types';

export const unbanHelp: CommandHelp = {
  name: 'unban',
  description: 'Unban a previously banned user.',
  subcommands: [
    {
      usage: '/gork unban [@user ...]',
      description:
        'Unban one or more users. Opens a picker modal if no users specified.',
      adminOnly: true,
    },
  ],
};
