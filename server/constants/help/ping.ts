import type { CommandHelp } from '~/types';

export const ping: CommandHelp = {
  name: 'ping',
  description: 'Check if Gork is alive.',
  subcommands: [
    {
      usage: 'ping',
      description: 'Responds with pong if Gork is online.',
    },
  ],
};
