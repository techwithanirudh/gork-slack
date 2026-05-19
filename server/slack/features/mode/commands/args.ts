import { z } from 'zod';
import { parseCommandArgs } from '~/utils/args';

export const SUBCOMMANDS = ['set', 'show', 'clear'] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];

export type ParsedArgs = ReturnType<typeof parseArgs>;

export function parseArgs(text: string) {
  const result = parseCommandArgs(text, {
    subcommand: z.enum(SUBCOMMANDS).optional(),
    scope: z.enum(['workspace', 'channel']).optional(),
    mode: z.enum(['ping', 'relevance', 'keyword', 'none']).optional(),
  });

  return {
    subcommand: result.success ? (result.data.subcommand ?? null) : null,
    scope: result.success ? (result.data.scope ?? null) : null,
    mode: result.success ? result.data.mode : undefined,
    error: result.success ? null : result.error,
  };
}
