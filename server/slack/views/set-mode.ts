import type {
  AllMiddlewareArgs,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
} from '@slack/bolt';
import { restrictedChannels } from '~/config';
import { isResponseMode, type ModeScope, setMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { sendModeChangeNotification } from '~/lib/slack/notifications';
import { isNonEmptyString, parseViewMetadata } from './metadata';

export const name = 'set_mode_modal';

interface ModalMetadata {
  channelId: string;
  isAdmin: boolean;
  openedBy: string;
  workspaceId: string;
}

function parseModeMetadata(raw: string): ModalMetadata | null {
  const metadata = parseViewMetadata(raw);
  if (!metadata) {
    return null;
  }

  const { channelId, workspaceId, openedBy, isAdmin } = metadata;
  const hasRequiredStrings =
    isNonEmptyString(channelId) &&
    isNonEmptyString(workspaceId) &&
    isNonEmptyString(openedBy);
  if (!hasRequiredStrings || typeof isAdmin !== 'boolean') {
    return null;
  }

  return { channelId, workspaceId, openedBy, isAdmin };
}

export async function execute({
  ack,
  body,
  view,
  client,
}: SlackViewMiddlewareArgs<ViewSubmitAction> &
  AllMiddlewareArgs): Promise<void> {
  const userId = body.user.id;

  const metadata = parseModeMetadata(view.private_metadata);
  if (!metadata) {
    await ack({
      response_action: 'errors',
      errors: { mode_select: 'Invalid modal state. Please try again.' },
    });
    return;
  }

  const { workspaceId, channelId } = metadata;
  const canManageProtectedScope =
    metadata.openedBy === userId && metadata.isAdmin;
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

  if (scope === 'workspace' && !canManageProtectedScope) {
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
    !canManageProtectedScope
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
    await setMode({ scope, id, mode });
    logger.info({ scope, id, mode, setBy: userId }, 'Mode set via modal');
    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: `${scope} mode set to *${mode}*`,
    });
    await sendModeChangeNotification({
      action: 'set',
      client,
      scope,
      workspaceId,
      channelId,
      mode,
      changedBy: userId,
    });
  } catch (error) {
    logger.error({ error, scope, id, mode }, 'Failed to save mode');
  }
}
