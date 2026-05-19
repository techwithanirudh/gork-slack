import { splitArgs } from '~/utils/text';
import {
  execute as modeExecute,
  name as modeName,
} from '../features/mode/commands';
import {
  execute as banExecute,
  name as banName,
} from '../features/reports/commands/ban';
import {
  execute as reportsExecute,
  name as reportsName,
} from '../features/reports/commands/reports';
import {
  execute as unbanExecute,
  name as unbanName,
} from '../features/reports/commands/unban';
import { execute as helpExecute, name as helpName } from './help';
import { execute as pingExecute } from './ping';

type CommandContext = Parameters<typeof banExecute>[0];

const subcommands = [
  { name: banName, execute: banExecute },
  { name: unbanName, execute: unbanExecute },
  { name: reportsName, execute: reportsExecute },
  { name: modeName, execute: modeExecute },
  { name: helpName, execute: helpExecute },
  { name: 'ping', execute: pingExecute },
];

function parseSubcommand(text: string): {
  subcommand: string | null;
  args: string;
} {
  const parts = splitArgs(text);
  if (!parts.length) {
    return { subcommand: null, args: '' };
  }
  return {
    subcommand: parts[0]?.toLowerCase() ?? null,
    args: parts.slice(1).join(' '),
  };
}

export async function handleCommand(context: CommandContext): Promise<void> {
  const { command, respond } = context;
  const { subcommand, args } = parseSubcommand(command.text);

  if (!subcommand) {
    await helpExecute(context);
    return;
  }

  const handler = subcommands.find((s) => s.name === subcommand);
  if (!handler) {
    await context.ack();
    await respond({
      text: `Unknown subcommand: \`${subcommand}\`\nRun \`${command.command} help\` to see all commands.`,
      response_type: 'ephemeral',
    });
    return;
  }

  await handler.execute({ ...context, command: { ...command, text: args } });
}
