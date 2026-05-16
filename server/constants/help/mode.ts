import type { CommandHelp } from '~/types';

export const mode: CommandHelp = {
  name: 'mode',
  description: 'Control when Gork replies in this workspace or channel.',
  subcommands: [
    {
      usage: 'mode set [workspace|channel] <mode>',
      description:
        'Set the reply mode. Workspace scope requires admin. Omit scope to open a modal.',
      permissions: ['admin (workspace scope)'],
    },
    {
      usage: 'mode show [workspace|channel]',
      description: 'Show stored modes and the effective mode for this channel.',
    },
    {
      usage: 'mode clear <workspace|channel>',
      description: 'Clear a stored mode. Workspace scope requires admin.',
      permissions: ['admin (workspace scope)'],
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
