export interface CommandHelp {
  description: string;
  modes?: { name: string; description: string }[];
  name: string;
  subcommands: { usage: string; description: string; adminOnly?: boolean }[];
}

export const modeHelp: CommandHelp = {
  name: 'mode',
  description: 'Control when Gork replies in this channel.',
  subcommands: [
    {
      usage: '/gork mode set <mode>',
      description: 'Set the reply mode for this channel.',
      adminOnly: true,
    },
    {
      usage: '/gork mode show',
      description: 'Show the current mode for this channel.',
    },
    {
      usage: '/gork mode clear',
      description: 'Reset to the default mode.',
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
