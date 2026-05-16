import type { ModeScope, ResponseMode } from '~/lib/kv';
import { splitArgs } from '~/utils/text';

export const SUBCOMMANDS = ['set', 'show', 'clear'] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];

export function isSubcommand(v: string): v is Subcommand {
  return (SUBCOMMANDS as readonly string[]).includes(v);
}

export function isScope(v: string): v is ModeScope {
  return v === 'workspace' || v === 'channel';
}

export interface ParsedArgs {
  mode: ResponseMode | undefined;
  scope: ModeScope | null;
  subcommand: Subcommand | null;
}

// Arg layout (after subcommand): [scope] [mode]
//
// Examples:
//   "set relevance"           → subcommand=set, scope=null, mode=relevance
//   "set workspace relevance" → subcommand=set, scope=workspace, mode=relevance
//   "show workspace"          → subcommand=show, scope=workspace, mode=undefined
//   "clear"                   → subcommand=clear, scope=null, mode=undefined
//
// When no subcommand is given, the first token is tested as subcommand;
// if it doesn't match, all tokens shift left (unrecognised subcommand → scope/mode).
export function parseArgs(text: string): ParsedArgs {
  const [sub, a0, a1] = splitArgs(text).map((t) => t.toLowerCase());
  const subcommand = sub && isSubcommand(sub) ? sub : null;
  const [arg0, arg1] = subcommand ? [a0, a1] : [sub, a0];
  const scope = arg0 && isScope(arg0) ? arg0 : null;
  const modeToken = scope ? arg1 : arg0;
  return {
    subcommand,
    scope,
    mode: modeToken as ResponseMode | undefined,
  };
}
