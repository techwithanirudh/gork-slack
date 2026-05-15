import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import { type ResponseMode, setChannelMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { MODE_LABELS } from '~/slack/commands/mode';

export const name = 'set_mode_modal';

const VALID_MODES = new Set<string>([
  'ping',
  'relevance',
  'ping+keyword',
  'none',
]);

export async function execute({
  ack,
  body,
  view,
  client,
}: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs) {
  const userId = body.user.id;
  const channelId = view.private_metadata;

  if (!channelId) {
    await ack({
      response_action: 'errors',
      errors: { mode_select: 'Could not determine channel. Please try again.' },
    });
    return;
  }

  const mode = view.state.values.mode_select?.mode?.selected_option?.value;
  if (!(mode && VALID_MODES.has(mode))) {
    await ack({
      response_action: 'errors',
      errors: { mode_select: 'Please select a valid mode.' },
    });
    return;
  }

  await ack();
  await setChannelMode(channelId, mode as ResponseMode);
  logger.info({ channelId, mode, setBy: userId }, 'Channel mode set via modal');

  await client.chat.postEphemeral({
    channel: channelId,
    user: userId,
    text: `channel mode set to *${MODE_LABELS[mode as ResponseMode]}*`,
  });
}
