import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { banHelp, modeHelp, reportsHelp, unbanHelp } from '~/constants/help';

export const name = 'help';

const WHITESPACE_PATTERN = /\s+/;

const commands = [banHelp, unbanHelp, reportsHelp, modeHelp] as const;

function buildOverview(): string {
  const lines = commands.map((c) => `• *${c.name}* — ${c.description}`);
  lines.push(
    '',
    'Use `/gork help <command>` for detailed usage.',
    'Use `!stop` to silence gork in a thread.',
    'Use `!leave` to make gork leave the channel.',
    '',
    'Made with :heart: by <https://devarsh.me/|Devarsh> & <https://techwithanirudh.com|Anirudh>'
  );
  return `*Gork — available commands*\n\n${lines.join('\n')}`;
}

function buildCommandHelp(commandName: string): string | null {
  const cmd = commands.find((c) => c.name === commandName);
  if (!cmd) {
    return null;
  }

  const subcommandLines = cmd.subcommands
    .map(
      (s) =>
        `• \`${s.usage}\` — ${s.description}${s.adminOnly ? ' _(admins only)_' : ''}`
    )
    .join('\n');

  const modeLine =
    'modes' in cmd && cmd.modes && cmd.modes.length > 0
      ? `\n\n*Modes:*\n${cmd.modes.map((m) => `• *${m.name}* — ${m.description}`).join('\n')}`
      : '';

  return `*/${commandName}* — ${cmd.description}\n\n*Subcommands:*\n${subcommandLines}${modeLine}`;
}

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, respond } = context;

  await ack();

  const args = (body as { text?: string }).text?.trim() ?? '';
  const [commandName] = args.split(WHITESPACE_PATTERN);

  if (commandName) {
    const detail = buildCommandHelp(commandName.toLowerCase());
    if (!detail) {
      await respond({
        text: `unknown command \`${commandName}\`. run \`/gork help\` to see all commands.`,
        response_type: 'ephemeral',
      });
      return;
    }
    await respond({ text: detail, response_type: 'ephemeral' });
    return;
  }

  await respond({ text: buildOverview(), response_type: 'ephemeral' });
}
