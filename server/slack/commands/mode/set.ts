import type { RespondFn } from '@slack/bolt';
import type { KnownBlock } from '@slack/types';
import type { WebClient } from '@slack/web-api';
import { restrictedChannels } from '~/config';
import { mode as modeHelp } from '~/constants/help';
import { MODES, type ModeScope, type ResponseMode, setMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { isAdmin } from '~/lib/permissions';
import { section } from '~/lib/slack/blocks';
import { sendModeChangeNotification } from '~/lib/slack/notifications';

interface SetArgs {
  channelId: string;
  mode: ResponseMode | undefined;
  scope: ModeScope;
  userId: string;
  workspaceId: string;
}

export async function handleSet(
  client: WebClient,
  respond: RespondFn,
  triggerId: string,
  { workspaceId, channelId, userId, scope, mode }: SetArgs
): Promise<void> {
  if (mode) {
    const id = scope === 'workspace' ? workspaceId : channelId;

    if (scope === 'workspace' && !(await isAdmin(client, userId))) {
      await respond({
        text: 'only workspace admins can set the workspace mode.',
        response_type: 'ephemeral',
      });
      return;
    }
    if (
      scope === 'channel' &&
      restrictedChannels.some((c) => c.id === channelId) &&
      !(await isAdmin(client, userId))
    ) {
      await respond({
        text: 'only workspace admins can change the mode in this channel.',
        response_type: 'ephemeral',
      });
      return;
    }

    await setMode({ scope, id, mode });
    logger.info({ scope, id, mode, changedBy: userId }, 'Mode set via command');
    await respond({
      text: `${scope} mode set to ${MODES[mode]}`,
      blocks: [
        section(
          `*${scope === 'workspace' ? 'Workspace' : 'Channel'} mode set to* ${MODES[mode]}`
        ),
      ],
      response_type: 'ephemeral',
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
    return;
  }

  const userIsAdmin = await isAdmin(client, userId);
  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'set_mode_modal',
      private_metadata: JSON.stringify({
        workspaceId,
        channelId,
        openedBy: userId,
        isAdmin: userIsAdmin,
      }),
      title: { type: 'plain_text', text: 'Set Mode' },
      submit: { type: 'plain_text', text: 'Set' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        ...(userIsAdmin
          ? [
              {
                type: 'input',
                block_id: 'scope_select',
                label: { type: 'plain_text' as const, text: 'Scope' },
                element: {
                  type: 'static_select' as const,
                  action_id: 'scope',
                  initial_option: {
                    text: {
                      type: 'plain_text' as const,
                      text: scope === 'workspace' ? 'Workspace' : 'Channel',
                    },
                    value: scope,
                  },
                  options: [
                    {
                      text: { type: 'plain_text' as const, text: 'Channel' },
                      value: 'channel',
                    },
                    {
                      text: { type: 'plain_text' as const, text: 'Workspace' },
                      value: 'workspace',
                    },
                  ],
                },
              } satisfies KnownBlock,
            ]
          : []),
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
}
