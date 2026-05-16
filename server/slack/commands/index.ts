import { splitArgs } from '~/utils/text';
import { execute as banExecute, name as banName } from './ban';
import { execute as helpExecute, name as helpName } from './help';
import { execute as modeExecute, name as modeName } from './mode';
import { execute as reportsExecute, name as reportsName } from './reports';
import { execute as unbanExecute, name as unbanName } from './unban';

const subcommands = [
  { name: banName, execute: banExecute },
  { name: unbanName, execute: unbanExecute },
  { name: reportsName, execute: reportsExecute },
  { name: modeName, execute: modeExecute },
  { name: helpName, execute: helpExecute },
] as const;

// Regex to match /gork, /gork-dev, /gork-st, /gork-anything, etc.
export const GORK_COMMAND_PATTERN = /^\/gork(?:-\w+)?$/;

function parseSubcommand(text: string): {
  subcommand: string | null;
  args: string;
} {
  const parts = splitArgs(text);
  if (!parts.length) {
    return { subcommand: null, args: '' };
  }

  const subcommand = parts[0]?.toLowerCase() ?? null;
  const args = parts.slice(1).join(' ');

  return { subcommand, args };
}

async function handleGorkCommand(
  context: Parameters<typeof banExecute>[0]
): Promise<void> {
  const { command, respond } = context;
  const { subcommand, args } = parseSubcommand(command.text);

  if (!subcommand) {
    const helpHandler = subcommands.find((s) => s.name === 'help');
    if (helpHandler) {
      await helpHandler.execute(context);
    }
    return;
  }

  const handler = subcommands.find((s) => s.name === subcommand);

  if (!handler) {
    await context.ack();
    await respond({
      text: `Unknown subcommand: \`${subcommand}\`\nRun \`${command.command} help\` to see all available commands.`,
      response_type: 'ephemeral',
    });
    return;
  }

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
