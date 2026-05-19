import type { RespondFn } from '@slack/bolt';
import { Context, Divider, Header, Section } from 'slack-block-builder';
import {
  getEffectiveMode,
  getStoredMode,
  MODES,
  type ModeScope,
} from '~/lib/kv';
import { asBlocks } from '~/lib/slack/blocks';

export async function showMode(
  workspaceId: string,
  channelId: string,
  scope: ModeScope | null,
  respond: RespondFn
): Promise<void> {
  if (scope === 'workspace') {
    const stored = await getStoredMode({ scope: 'workspace', id: workspaceId });
    await respond({
      text: stored
        ? `Workspace mode: ${MODES[stored]}`
        : 'No workspace mode set',
      blocks: asBlocks(
        stored
          ? Section({ text: `*Workspace mode:* ${MODES[stored]}` })
          : Section({
              text: '_No workspace mode set_ - defaults to *relevance*',
            }),
        Context().elements('Applies to all channels unless overridden.')
      ),
      response_type: 'ephemeral',
    });
    return;
  }

  if (scope === 'channel') {
    const [stored, effective] = await Promise.all([
      getStoredMode({ scope: 'channel', id: channelId }),
      getEffectiveMode({ workspaceId, channelId }),
    ]);
    await respond({
      text: `Channel override: ${stored ? MODES[stored] : 'not set'} - effective: ${MODES[effective]}`,
      blocks: asBlocks(
        stored
          ? Section({ text: `*Channel override:* ${MODES[stored]}` })
          : Section({ text: '_No channel override set_' }),
        Context().elements(`Effective here: *${MODES[effective]}*`)
      ),
      response_type: 'ephemeral',
    });
    return;
  }

  const [workspace, channel, effective] = await Promise.all([
    getStoredMode({ scope: 'workspace', id: workspaceId }),
    getStoredMode({ scope: 'channel', id: channelId }),
    getEffectiveMode({ workspaceId, channelId }),
  ]);

  await respond({
    text: `Effective mode: ${MODES[effective]}`,
    blocks: asBlocks(
      Header({ text: 'Reply Mode' }),
      Section().fields(
        `*Workspace*\n${workspace ? `*${MODES[workspace]}*` : '_not set_'}`,
        `*Channel override*\n${channel ? `*${MODES[channel]}*` : '_not set_'}`
      ),
      Divider(),
      Context().elements(`Effective in this channel: *${MODES[effective]}*`)
    ),
    response_type: 'ephemeral',
  });
}
