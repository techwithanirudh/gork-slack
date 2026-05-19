import type { RespondFn } from '@slack/bolt';
import type { WebClient } from '@slack/web-api';
import { Section } from 'slack-block-builder';
import { clearMode, type ModeScope } from '~/lib/kv';
import logger from '~/lib/logger';
import { isAdmin } from '~/lib/permissions';
import { asBlocks } from '~/lib/slack/blocks';
import { sendModeChangeNotification } from '../notifications';
import { canManageModeScope } from '../utils/permissions';

interface ClearArgs {
  channelId: string;
  scope: ModeScope;
  userId: string;
  workspaceId: string;
}

export async function handleClear(
  client: WebClient,
  respond: RespondFn,
  { workspaceId, channelId, userId, scope }: ClearArgs
): Promise<void> {
  const id = scope === 'workspace' ? workspaceId : channelId;

  const userIsAdmin = await isAdmin(client, userId);
  if (!canManageModeScope({ channelId, isAdmin: userIsAdmin, scope })) {
    await respond({
      text:
        scope === 'workspace'
          ? 'only workspace admins can clear the workspace mode.'
          : 'only workspace admins can change the mode in this channel.',
      response_type: 'ephemeral',
    });
    return;
  }

  try {
    await clearMode({ scope, id });
    logger.info({ scope, id, changedBy: userId }, 'Mode cleared via command');
    await respond({
      text:
        scope === 'workspace'
          ? 'workspace mode cleared'
          : 'channel mode cleared',
      blocks: asBlocks(
        Section({
          text:
            scope === 'workspace'
              ? 'workspace mode wiped. channels fall back to their own override, or relevance'
              : 'channel mode cleared. falls back to workspace default, or relevance',
        })
      ),
      response_type: 'ephemeral',
    });
    await sendModeChangeNotification({
      action: 'clear',
      client,
      scope,
      workspaceId,
      channelId,
      changedBy: userId,
    });
  } catch (error) {
    logger.error({ error, scope, id }, 'Failed to clear mode');
    await respond({
      text: 'failed to clear mode. try again in a bit.',
      response_type: 'ephemeral',
    });
  }
}
