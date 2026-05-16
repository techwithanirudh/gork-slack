import type {
  AllMiddlewareArgs,
  RespondFn,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { restrictedChannels } from '~/config';
import { mode as modeHelp } from '~/constants/help';
import { clearChannelMode, getChannelMode, type ResponseMode } from '~/lib/kv';
import { isAdmin } from '~/lib/permissions';
import { splitArgs } from '~/utils/text';

export const name = 'mode';

export const MODES: Record<ResponseMode, string> = {
  ping: 'ping only',
  relevance: 'relevance (default)',
  'ping+keyword': 'ping + keyword',
  none: 'none',
};

async function showCurrentMode(
  channelId: string,
  respond: RespondFn
): Promise<void> {
  const mode = await getChannelMode(channelId);
  await respond({
    text: `current mode for this channel: *${MODES[mode]}*`,
    response_type: 'ephemeral',
  });
}

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
): Promise<void> {
  const { ack, body, command, client, respond } = context;

  await ack();

  const channelId = body.channel_id;
  const userId = body.user_id;
  const [subcommand] = splitArgs(command.text ?? '');

  switch (subcommand?.toLowerCase()) {
    case 'set': {
      const isRestricted = restrictedChannels.some((c) => c.id === channelId);
      if (isRestricted && !(await isAdmin(client, userId))) {
        await respond({
          text: 'only workspace admins can change the mode in this channel.',
          response_type: 'ephemeral',
        });
        return;
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'set_mode_modal',
          private_metadata: channelId,
          title: { type: 'plain_text', text: 'Set Channel Mode' },
          submit: { type: 'plain_text', text: 'Set' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'input',
              block_id: 'mode_select',
              label: { type: 'plain_text', text: 'Reply mode' },
              element: {
                type: 'static_select',
                action_id: 'mode',
                placeholder: { type: 'plain_text', text: 'Choose a mode…' },
                options: (modeHelp.modes ?? []).map((m) => ({
                  text: { type: 'plain_text', text: m.name },
                  value: m.name,
                  description: { type: 'plain_text', text: m.description },
                })),
              },
            },
          ],
        },
      });
      break;
    }

    case 'show': {
      await showCurrentMode(channelId, respond);
      break;
    }

    case 'clear': {
      const isRestricted = restrictedChannels.some((c) => c.id === channelId);
      if (isRestricted && !(await isAdmin(client, userId))) {
        await respond({
          text: 'only workspace admins can change the mode in this channel.',
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
      await showCurrentMode(channelId, respond);
    }
  }
}
