import type { CommandHelp } from '~/types';

export const reports: CommandHelp = {
  name: 'reports',
  description: 'View reports filed against a user.',
  subcommands: [
    {
      usage: 'reports',
      description: 'Opens a modal to view reports for a selected user.',
      permissions: ['admin'],
    },
  ],
};
