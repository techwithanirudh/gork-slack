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
