import type { RespondFn } from '@slack/bolt';
import type { KnownBlock } from '@slack/types';
import {
  getEffectiveMode,
  getStoredMode,
  MODES,
  type ModeScope,
  type ResponseMode,
} from '~/lib/kv';
import {
  context as contextBlock,
  divider,
  fields,
  header,
  section,
} from '~/lib/slack/blocks';

function buildBlocks(
  workspace: ResponseMode | null,
  channel: ResponseMode | null,
  effective: ResponseMode
): KnownBlock[] {
  return [
    header('Reply Mode'),
    fields(
      `*Workspace*\n${workspace ? `*${MODES[workspace]}*` : '_not set_'}`,
      `*Channel override*\n${channel ? `*${MODES[channel]}*` : '_not set_'}`
    ),
    divider(),
    contextBlock(`Effective in this channel: *${MODES[effective]}*`),
  ];
}

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
      blocks: [
        stored
          ? section(`*Workspace mode:* ${MODES[stored]}`)
          : section('_No workspace mode set_ — defaults to *relevance*'),
        contextBlock('Applies to all channels unless overridden.'),
      ],
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
      text: `Channel override: ${stored ? MODES[stored] : 'not set'} — effective: ${MODES[effective]}`,
      blocks: [
        stored
          ? section(`*Channel override:* ${MODES[stored]}`)
          : section('_No channel override set_'),
        contextBlock(`Effective here: *${MODES[effective]}*`),
      ],
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
    blocks: buildBlocks(workspace, channel, effective),
    response_type: 'ephemeral',
  });
}
