export interface CommandHelp {
  description: string;
  modes?: { name: string; description: string }[];
  name: string;
  subcommands: { usage: string; description: string; adminOnly?: boolean }[];
}

export const banHelp: CommandHelp = {
  name: 'ban',
  description: 'Ban a user from interacting with Gork.',
  subcommands: [
    {
      usage: '/gork ban [@user ...]',
      description:
        'Ban one or more users. Opens a picker modal if no users specified.',
      adminOnly: true,
    },
  ],
};

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

export const modeHelp: CommandHelp = {
  name: 'mode',
  description: 'Control when Gork replies in this channel.',
  subcommands: [
    {
      usage: '/gork mode set',
      description: 'Open a modal to set the reply mode for this channel.',
      adminOnly: true,
    },
    {
      usage: '/gork mode show',
      description: 'Show the current reply mode for this channel.',
    },
    {
      usage: '/gork mode clear',
      description: 'Reset to the default mode (relevance).',
      adminOnly: true,
    },
  ],
  modes: [
    { name: 'ping', description: 'Only respond when directly @mentioned.' },
    {
      name: 'relevance',
      description: 'Respond when AI decides the message is relevant (default).',
    },
    {
      name: 'ping+keyword',
      description: 'Respond to @mentions and keyword matches.',
    },
    { name: 'none', description: 'Never respond in this channel.' },
  ],
};
