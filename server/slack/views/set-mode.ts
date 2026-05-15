import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import { isResponseMode, type ResponseMode, setChannelMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { MODE_LABELS } from '~/slack/commands/mode';

export const name = 'set_mode_modal';

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
  if (!isResponseMode(mode)) {
    await ack({
      response_action: 'errors',
      errors: { mode_select: 'Please select a valid mode.' },
    });
    return;
  }

  await ack();

  try {
    await setChannelMode(channelId, mode as ResponseMode);
    logger.info(
      { channelId, mode, setBy: userId },
      'Channel mode set via modal'
    );
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `channel mode set to *${MODE_LABELS[mode as ResponseMode]}*`,
    });
  } catch (error) {
    logger.error({ error, channelId, mode }, 'Failed to save channel mode');
  }
}
