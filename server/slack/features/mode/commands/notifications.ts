import type { WebClient } from '@slack/web-api';
import { Header, Section } from 'slack-block-builder';
import { env } from '~/env';
import { MODES, type ModeScope, type ResponseMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { asBlocks } from '~/lib/slack/blocks';

interface ModeChangeNotificationParams {
  action: 'clear' | 'set';
  changedBy: string;
  channelId: string;
  client: WebClient;
  mode?: ResponseMode;
  scope: ModeScope;
  workspaceId: string;
}

export async function sendModeChangeNotification({
  action,
  channelId,
  changedBy,
  client,
  mode,
  scope,
  workspaceId,
}: ModeChangeNotificationParams): Promise<void> {
  if (!env.LOGS_CHANNEL) {
    logger.warn(
      'Mode change notification not sent because LOGS_CHANNEL is not configured'
    );
    return;
  }

  const target =
    scope === 'workspace' ? `workspace ${workspaceId}` : `<#${channelId}>`;
  const description =
    action === 'set'
      ? `Reply mode was set to *${mode ? MODES[mode] : 'unknown'}*.`
      : 'Reply mode was cleared.';

  try {
    await client.chat.postMessage({
      channel: env.LOGS_CHANNEL,
      text: `Gork ${scope} mode ${action} by <@${changedBy}>`,
      blocks: asBlocks(
        Header({ text: action === 'set' ? 'Mode Set' : 'Mode Cleared' }),
        Section({ text: description }),
        Section().fields(
          `*Changed By*\n<@${changedBy}>`,
          `*Scope*\n${scope}`,
          `*Target*\n${target}`
        )
      ),
    });
    logger.info(
      { action, scope, channelId, workspaceId, mode, changedBy },
      'Mode change notification sent'
    );
  } catch (error) {
    logger.warn(
      { error, action, scope, channelId, workspaceId, mode, changedBy },
      'Failed to send mode change notification'
    );
  }
}
