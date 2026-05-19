import type { RespondFn } from '@slack/bolt';
import type { WebClient } from '@slack/web-api';
import { Input, Option, Section, StaticSelect } from 'slack-block-builder';
import { restrictedChannels } from '~/config';
import { MODES, type ModeScope, type ResponseMode, setMode } from '~/lib/kv';
import logger from '~/lib/logger';
import { isAdmin } from '~/lib/permissions';
import { asBlocks } from '~/lib/slack/blocks';
import { sendModeChangeNotification } from '../notifications';
import { help as modeHelp } from '.';

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

    if (scope === 'workspace' && mode === 'none') {
      await respond({
        text: '`none` can only be set at the channel scope.',
        response_type: 'ephemeral',
      });
      return;
    }
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
      blocks: asBlocks(
        Section({
          text: `*${scope === 'workspace' ? 'Workspace' : 'Channel'} mode set to* ${MODES[mode]}`,
        })
      ),
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
      blocks: asBlocks(
        ...(userIsAdmin
          ? [
              Input({ blockId: 'scope_select', label: 'Scope' }).element(
                StaticSelect({ actionId: 'scope' })
                  .initialOption(
                    Option({
                      text: scope === 'workspace' ? 'Workspace' : 'Channel',
                      value: scope,
                    })
                  )
                  .options(
                    Option({ text: 'Channel', value: 'channel' }),
                    Option({ text: 'Workspace', value: 'workspace' })
                  )
              ),
            ]
          : []),
        Input({ blockId: 'mode_select', label: 'Reply mode' }).element(
          StaticSelect({
            actionId: 'mode',
            placeholder: 'Choose a mode...',
          }).options(
            ...(modeHelp.modes ?? []).map((m) =>
              Option({
                text: m.name,
                value: m.name,
                description: m.description,
              })
            )
          )
        )
      ),
    },
  });
}
