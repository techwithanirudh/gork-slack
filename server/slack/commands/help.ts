import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { Context, Divider, Section } from 'slack-block-builder';
import { z } from 'zod';
import { ban, mode, ping, reports, unban } from '~/constants/help';
import { asBlocks } from '~/lib/slack/blocks';
import { parseCommandArgs } from '~/utils/args';

export const name = 'help';

const commands = [ban, unban, reports, mode, ping] as const;

function buildOverviewBlocks(cmd: string) {
  const commandList = commands
    .map((c) => `*${c.name}:* ${c.description}`)
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

function buildCommandBlocks(
  commandName: (typeof commands)[number]['name'],
  cmd: string
) {
  const command = commands.find((c) => c.name === commandName);
  if (!command) {
    return [];
  }

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
    command: z.enum(['ban', 'unban', 'reports', 'mode', 'ping']).optional(),
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
