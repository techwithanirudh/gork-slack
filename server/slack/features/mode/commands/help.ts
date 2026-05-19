import type { CommandHelp } from '~/types';

export const mode: CommandHelp = {
  name: 'mode',
  description: 'Control when Gork replies in this workspace or channel.',
  subcommands: [
    {
      usage: 'mode set [workspace|channel] <mode>',
      description:
        'Set the reply mode. Omit scope to open a modal. Workspace scope requires admin.',
    },
    {
      usage: 'mode show [workspace|channel]',
      description: 'Show stored modes and the effective mode for this channel.',
    },
    {
      usage: 'mode clear <workspace|channel>',
      description: 'Clear a stored mode. Workspace scope requires admin.',
    },
  ],
  modes: [
    { name: 'ping', description: 'Only respond when directly @mentioned.' },
    {
      name: 'relevance',
      description:
        'Respond to @mentions, keywords, and AI relevance (default).',
    },
    {
      name: 'keyword',
      description: 'Respond to @mentions and keyword matches only.',
    },
    {
      name: 'none',
      description: 'Never respond in this channel. (channel only)',
    },
  ],
};
