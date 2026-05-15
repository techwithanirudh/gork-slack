import type { CommandHelp } from '~/types';

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
