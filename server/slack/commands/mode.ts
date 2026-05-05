import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { modeHelp } from '~/constants/help';
import {
  clearChannelMode,
  getChannelMode,
  type ResponseMode,
  setChannelMode,
} from '~/lib/kv';
import { isAdmin } from '~/lib/reports';

export const name = 'mode';

const WHITESPACE_PATTERN = /\s+/;

const MODE_LABELS: Record<ResponseMode, string> = {
  ping: 'ping only',
  relevance: 'relevance (default)',
  'ping+keyword': 'ping + keyword',
  none: 'none',
};

const VALID_MODES = new Set<string>([
  'ping',
  'relevance',
  'ping+keyword',
  'none',
]);

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, respond } = context;

  await ack();

  const channelId = body.channel_id;
  const userId = body.user_id;
  const args = (body as { text?: string }).text?.trim() ?? '';
  const [subcommand, modeArg] = args.split(WHITESPACE_PATTERN);

  switch (subcommand?.toLowerCase()) {
    case 'set': {
      if (!isAdmin(userId)) {
        await respond({
          text: 'only admins can change the mode',
          response_type: 'ephemeral',
        });
        return;
      }
      if (!(modeArg && VALID_MODES.has(modeArg))) {
        await respond({
          text: `invalid mode. valid options: ${[...VALID_MODES].join(', ')}\nusage: \`/gork mode set <mode>\``,
          response_type: 'ephemeral',
        });
        return;
      }
      await setChannelMode(channelId, modeArg as ResponseMode);
      await respond({
        text: `cool, gork will now use **${MODE_LABELS[modeArg as ResponseMode]}** mode in this channel`,
        response_type: 'ephemeral',
      });
      break;
    }

    case 'show': {
      const mode = await getChannelMode(channelId);
      await respond({
        text: `current mode for this channel: **${MODE_LABELS[mode]}**`,
        response_type: 'ephemeral',
      });
      break;
    }

    case 'clear': {
      if (!isAdmin(userId)) {
        await respond({
          text: 'only admins can change the mode',
          response_type: 'ephemeral',
        });
        return;
      }
      await clearChannelMode(channelId);
      await respond({
        text: 'channel mode cleared — back to default (relevance)',
        response_type: 'ephemeral',
      });
      break;
    }

    default: {
      const usage = modeHelp.subcommands
        .map(
          (s) =>
            `• \`${s.usage}\` — ${s.description}${s.adminOnly ? ' _(admins only)_' : ''}`
        )
        .join('\n');
      const modes = (modeHelp.modes ?? [])
        .map((m) => `• *${m.name}* — ${m.description}`)
        .join('\n');
      await respond({
        text: `*${modeHelp.description}*\n\n*Subcommands:*\n${usage}\n\n*Modes:*\n${modes}`,
        response_type: 'ephemeral',
      });
    }
  }
}
