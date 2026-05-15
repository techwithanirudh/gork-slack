import type { CommandHelp } from '~/types';

export const reportsHelp: CommandHelp = {
  name: 'reports',
  description: 'View reports filed against a user.',
  subcommands: [
    {
      usage: '/gork reports',
      description: 'Opens a modal to view reports for a selected user.',
      adminOnly: true,
    },
  ],
};
