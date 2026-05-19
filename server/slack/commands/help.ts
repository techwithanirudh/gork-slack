import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { Context, Divider, Section } from 'slack-block-builder';
import { z } from 'zod';
import { asBlocks } from '~/lib/slack/blocks';
import { parseCommandArgs } from '~/utils/args';
import { subcommands } from './subcommands';

export const name = 'help';

const allCommands = subcommands;

const commandNames = allCommands.map((c) => c.name) as [string, ...string[]];

function buildOverviewBlocks(cmd: string) {
  const commandList = allCommands
    .map((c) => `*${c.help.name}:* ${c.help.description}`)
    .join('\n');
  return asBlocks(
    Section({ text: '*Gork*\navailable commands' }),
    Divider(),
    Section({ text: commandList }),
    Divider(),
    Section({
      text: 'Use `!stop` to silence Gork in a thread.\nUse `!leave` to make Gork leave the channel.',
    }),
    Context().elements(
      `Run \`${cmd} help <command>\` for detailed usage. Made with :heart: by <https://devarsh.me/|Devarsh> & <https://techwithanirudh.com|Anirudh>`
    )
  );
}

function buildCommandBlocks(commandName: string, cmd: string) {
  const entry = allCommands.find((c) => c.name === commandName);
  if (!entry) {
    return [];
  }

  const { help: command } = entry;

  const subcommandText = command.subcommands
    .map((s) => {
      const permLabel = s.permissions?.length
        ? ` _(${s.permissions.join(', ')} only)_`
        : '';
      return `• \`${cmd} ${s.usage}\`${permLabel}: ${s.description}`;
    })
    .join('\n');

  const blocks = asBlocks(
    Section({ text: `*Command: ${command.name}*\n${command.description}` }),
    Divider(),
    Section({ text: `*Usage:*\n${subcommandText}` })
  );

  if (command.modes?.length) {
    const modeText = command.modes
      .map((m) => `• *${m.name}:* ${m.description}`)
      .join('\n');
    blocks.push(...asBlocks(Section({ text: `*Modes:*\n${modeText}` })));
  }

  return blocks;
}

export async function execute(
  ctx: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, command, respond } = ctx;
  await ack();

  const result = parseCommandArgs(command.text ?? '', {
    command: z.enum(commandNames).optional(),
  });

  if (!result.success) {
    await respond({
      text: `${result.error}\nRun \`${command.command} help\` to see all commands.`,
      response_type: 'ephemeral',
    });
    return;
  }

  const commandName = result.data.command ?? null;

  if (commandName) {
    await respond({
      text: `Help: ${commandName}`,
      blocks: buildCommandBlocks(commandName, command.command),
      response_type: 'ephemeral',
    });
    return;
  }

  await respond({
    text: 'Gork - available commands',
    blocks: buildOverviewBlocks(command.command),
    response_type: 'ephemeral',
  });
}
