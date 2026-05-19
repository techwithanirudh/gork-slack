import { splitArgs } from '~/utils/text';
import { execute as helpExecute, name as helpName } from './help';
import { subcommands } from './subcommands';

type CommandContext = Parameters<(typeof subcommands)[0]['execute']>[0];

const allCommands = [...subcommands, { name: helpName, execute: helpExecute }];

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

  const handler = allCommands.find((s) => s.name === subcommand);
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
