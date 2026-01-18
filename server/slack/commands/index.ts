import { execute as banExecute, name as banName } from './ban';
import { execute as reportsExecute, name as reportsName } from './reports';
import { execute as unbanExecute, name as unbanName } from './unban';

const subcommands = [
  { name: banName, execute: banExecute },
  { name: unbanName, execute: unbanExecute },
  { name: reportsName, execute: reportsExecute },
] as const;

const WHITESPACE_PATTERN = /\s+/;

// Regex to match /gork, /gork-dev, /gork-st, /gork-anything, etc.
export const GORK_COMMAND_PATTERN = /^\/gork(?:-\w+)?$/;

function parseSubcommand(text: string): {
  subcommand: string | null;
  args: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { subcommand: null, args: '' };
  }

  const parts = trimmed.split(WHITESPACE_PATTERN);
  const subcommand = parts[0]?.toLowerCase() ?? null;
  const args = parts.slice(1).join(' ');

  return { subcommand, args };
}

async function handleGorkCommand(
  context: Parameters<typeof banExecute>[0]
): Promise<void> {
  const { command, say } = context;
  const { subcommand, args } = parseSubcommand(command.text);

  if (!subcommand) {
    await context.ack();
    await say({
      text: `Available subcommands: ${subcommands.map((s) => s.name).join(', ')}\nUsage: \`/gork <subcommand> [args]\``,
    });
    return;
  }

  const handler = subcommands.find((s) => s.name === subcommand);

  if (!handler) {
    await context.ack();
    await say({
      text: `Unknown subcommand: \`${subcommand}\`\nAvailable subcommands: ${subcommands.map((s) => s.name).join(', ')}`,
    });
    return;
  }

  // Pass the remaining args in the text field for subcommands that need it
  const modifiedContext = {
    ...context,
    command: {
      ...command,
      text: args,
    },
  };

  await handler.execute(modifiedContext);
}

export const commands = [
  { pattern: GORK_COMMAND_PATTERN, execute: handleGorkCommand },
] as const;
