import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import { restrictedChannels } from '~/config';
import {
  isResponseMode,
  type ModeScope,
  type ResponseMode,
  setMode,
} from '~/lib/kv';
import logger from '~/lib/logger';
import { isAdmin } from '~/lib/permissions';

export const name = 'set_mode_modal';

interface ModalMetadata {
  channelId: string;
  scope: ModeScope;
  workspaceId: string;
}

export async function execute({
  ack,
  body,
  view,
  client,
}: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs) {
  const userId = body.user.id;

  let metadata: ModalMetadata;
  try {
    metadata = JSON.parse(view.private_metadata) as ModalMetadata;
  } catch {
    await ack({
      response_action: 'errors',
      errors: { mode_select: 'Invalid modal state. Please try again.' },
    });
    return;
  }

  const { workspaceId, channelId } = metadata;
  const scope: ModeScope =
    (view.state.values.scope_select?.scope?.selected_option?.value as
      | ModeScope
      | undefined) ?? 'channel';
  const mode = view.state.values.mode_select?.mode?.selected_option?.value;

  if (!isResponseMode(mode)) {
    await ack({
      response_action: 'errors',
      errors: { mode_select: 'Please select a valid mode.' },
    });
    return;
  }

  if (scope === 'workspace' && !(await isAdmin(client, userId))) {
    await ack({
      response_action: 'errors',
      errors: {
        scope_select: 'Only workspace admins can set the workspace mode.',
      },
    });
    return;
  }

  if (
    scope === 'channel' &&
    restrictedChannels.some((c) => c.id === channelId) &&
    !(await isAdmin(client, userId))
  ) {
    await ack({
      response_action: 'errors',
      errors: {
        scope_select:
          'Only workspace admins can change the mode in this channel.',
      },
    });
    return;
  }

  await ack();

  const id = scope === 'workspace' ? workspaceId : channelId;

  try {
    await setMode({ scope, id, mode: mode as ResponseMode });
    logger.info({ scope, id, mode, setBy: userId }, 'Mode set via modal');
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `${scope} mode set to *${mode}*`,
    });
  } catch (error) {
    logger.error({ error, scope, id, mode }, 'Failed to save mode');
  }
}
