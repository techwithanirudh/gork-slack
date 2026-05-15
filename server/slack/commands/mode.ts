import type {
  AllMiddlewareArgs,
  RespondFn,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import { mode as modeHelp } from '~/constants/help';
import { clearChannelMode, getChannelMode, type ResponseMode } from '~/lib/kv';

export const name = 'mode';

const WHITESPACE_PATTERN = /\s+/;

export const MODE_LABELS: Record<ResponseMode, string> = {
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
    text: `current mode for this channel: *${MODE_LABELS[mode]}*`,
    response_type: 'ephemeral',
  });
}

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
) {
  const { ack, body, command, client, respond } = context;

  await ack();

  const channelId = body.channel_id;
  const args = command.text?.trim() ?? '';
  const [subcommand] = args.split(WHITESPACE_PATTERN);

  switch (subcommand?.toLowerCase()) {
    case 'set': {
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
      await clearChannelMode(channelId);
      await respond({
        text: 'channel mode cleared — back to default (relevance)',
        response_type: 'ephemeral',
      });
      break;
    }

    default: {
      // bare /gork mode → show current status
      await showCurrentMode(channelId, respond);
    }
  }
}
