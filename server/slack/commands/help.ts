import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import type { KnownBlock } from '@slack/types';
import { ban, mode, reports, unban } from '~/constants/help';
import { context as contextBlock, divider, section } from '~/lib/slack/blocks';
import { splitArgs } from '~/utils/text';

export const name = 'help';

const commands = [ban, unban, reports, mode] as const;

function buildOverviewBlocks(cmd: string): KnownBlock[] {
  const commandList = commands
    .map((c) => `*${c.name}:* ${c.description}`)
    .join('\n');

  return [
    section('*Gork*\navailable commands'),
    divider(),
    section(commandList),
    divider(),
    section(
      'Use `!stop` to silence Gork in a thread.\nUse `!leave` to make Gork leave the channel.'
    ),
    contextBlock(
      `Run \`${cmd} help <command>\` for detailed usage. Made with :heart: by <https://devarsh.me/|Devarsh> & <https://techwithanirudh.com|Anirudh>`
    ),
  ];
}

function buildCommandBlocks(
  commandName: string,
  cmd: string
): KnownBlock[] | null {
  const command = commands.find((c) => c.name === commandName);
  if (!command) {
    return null;
  }

  const subcommandText = command.subcommands
    .map((s) => {
      const permLabel = s.permissions?.length
        ? ` _(${s.permissions.join(', ')} only)_`
        : '';
      return `• \`${cmd} ${s.usage}\`${permLabel}: ${s.description}`;
    })
    .join('\n');

  const blocks: KnownBlock[] = [
    section(`*Command: ${command.name}*\n${command.description}`),
    divider(),
    section(`*Subcommands:*\n${subcommandText}`),
  ];

  if (command.modes?.length) {
    const modeText = command.modes
      .map((m) => `• *${m.name}:* ${m.description}`)
      .join('\n');
    blocks.push(section(`*Modes:*\n${modeText}`));
  }

  return blocks;
}

export async function execute(
  ctx: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, command, respond } = ctx;

  await ack();

  const [commandName] = splitArgs(command.text ?? '');

  if (commandName) {
    const blocks = buildCommandBlocks(
      commandName.toLowerCase(),
      command.command
    );
    if (!blocks) {
      await respond({
        text: `unknown command \`${commandName}\`. run \`${command.command} help\` to see all commands.`,
        response_type: 'ephemeral',
      });
      return;
    }
    await respond({
      text: `Help: ${commandName}`,
      blocks,
      response_type: 'ephemeral',
    });
    return;
  }

  await respond({
    text: 'Gork — available commands',
    blocks: buildOverviewBlocks(command.command),
    response_type: 'ephemeral',
  });
}
