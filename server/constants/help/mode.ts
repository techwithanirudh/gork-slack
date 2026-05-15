import type { CommandHelp } from '~/types';

export const mode: CommandHelp = {
  name: 'mode',
  description: 'Control when Gork replies in this channel.',
  subcommands: [
    {
      usage: 'mode set',
      description: 'Open a modal to set the reply mode for this channel.',
    },
    {
      usage: 'mode show',
      description: 'Show the current reply mode for this channel.',
    },
    {
      usage: 'mode clear',
      description: 'Reset to the default mode (relevance).',
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
