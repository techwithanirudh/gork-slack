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

const commandNames = subcommands.map((c) => c.name) as [string, ...string[]];

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
    const entry = subcommands.find((c) => c.name === commandName);
    if (entry) {
      const { help } = entry;
      const subcommandText = help.subcommands
        .map((s) => {
          const permLabel = s.permissions?.length
            ? ` _(${s.permissions.join(', ')} only)_`
            : '';
          return `• \`${command.command} ${s.usage}\`${permLabel}: ${s.description}`;
        })
        .join('\n');
      const blocks = asBlocks(
        Section({ text: `*Command: ${help.name}*\n${help.description}` }),
        Divider(),
        Section({ text: `*Usage:*\n${subcommandText}` })
      );
      if (help.modes?.length) {
        blocks.push(
          ...asBlocks(
            Section({
              text: `*Modes:*\n${help.modes.map((m) => `• *${m.name}:* ${m.description}`).join('\n')}`,
            })
          )
        );
      }
      await respond({
        text: `Help: ${commandName}`,
        blocks,
        response_type: 'ephemeral',
      });
    }
    return;
  }

  await respond({
    text: 'Gork - available commands',
    blocks: asBlocks(
      Section({ text: '*Gork*\navailable commands' }),
      Divider(),
      Section({
        text: subcommands
          .map((c) => `*${c.help.name}:* ${c.help.description}`)
          .join('\n'),
      }),
      Divider(),
      Section({
        text: 'Use `!stop` to silence Gork in a thread.\nUse `!leave` to make Gork leave the channel.',
      }),
      Context().elements(
        `Run \`${command.command} help <command>\` for detailed usage. Made with :heart: by <https://devarsh.me/|Devarsh> & <https://techwithanirudh.com|Anirudh>`
      )
    ),
    response_type: 'ephemeral',
  });
}
