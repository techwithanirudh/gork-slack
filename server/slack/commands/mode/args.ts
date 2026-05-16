import { isResponseMode, type ModeScope, type ResponseMode } from '~/lib/kv';
import { splitArgs } from '~/utils/text';

export const SUBCOMMANDS = ['set', 'show', 'clear'] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];

export interface ParsedArgs {
  mode: ResponseMode | undefined;
  scope: ModeScope | null;
  subcommand: Subcommand | null;
}

// Arg layout (after subcommand): [scope] [mode]
//
//   "set relevance"           → subcommand=set, scope=null,      mode=relevance
//   "set workspace relevance" → subcommand=set, scope=workspace,  mode=relevance
//   "show workspace"          → subcommand=show, scope=workspace, mode=undefined
//   "clear"                   → subcommand=clear, scope=null,     mode=undefined
export function parseArgs(text: string): ParsedArgs {
  const [sub, a0, a1] = splitArgs(text).map((t) => t.toLowerCase());
  const subcommand =
    sub && (SUBCOMMANDS as readonly string[]).includes(sub)
      ? (sub as Subcommand)
      : null;
  const [arg0, arg1] = subcommand ? [a0, a1] : [sub, a0];
  const scope =
    arg0 === 'workspace' || arg0 === 'channel' ? (arg0 as ModeScope) : null;
  const modeToken = scope ? arg1 : arg0;

  return {
    subcommand,
    scope,
    mode: modeToken && isResponseMode(modeToken) ? modeToken : undefined,
  };
}
