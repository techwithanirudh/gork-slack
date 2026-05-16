import type {
  AllMiddlewareArgs,
  RespondFn,
  SlackCommandMiddlewareArgs,
} from '@slack/bolt';
import type { KnownBlock } from '@slack/types';
import type { WebClient } from '@slack/web-api';
import { restrictedChannels } from '~/config';
import { mode as modeHelp } from '~/constants/help';
import {
  clearMode,
  getEffectiveMode,
  getStoredMode,
  MODES,
  type ModeScope,
  type ResponseMode,
  setMode,
} from '~/lib/kv';
import { isAdmin } from '~/lib/permissions';
import {
  context as contextBlock,
  divider,
  fields,
  header,
  section,
} from '~/lib/slack/blocks';
import { splitArgs } from '~/utils/text';

export const name = 'mode';

function isScope(value: string): value is ModeScope {
  return value === 'workspace' || value === 'channel';
}

function buildShowBlocks(
  wsStored: ResponseMode | null,
  chStored: ResponseMode | null,
  effective: ResponseMode
): KnownBlock[] {
  return [
    header('Reply Mode'),
    fields(
      `*Workspace*\n${wsStored ? `*${MODES[wsStored]}*` : '_not set_'}`,
      `*Channel override*\n${chStored ? `*${MODES[chStored]}*` : '_not set_'}`
    ),
    divider(),
    contextBlock(`Effective in this channel: *${MODES[effective]}*`),
  ];
}

async function showMode(
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

  const [wsStored, chStored, effective] = await Promise.all([
    getStoredMode({ scope: 'workspace', id: workspaceId }),
    getStoredMode({ scope: 'channel', id: channelId }),
    getEffectiveMode({ workspaceId, channelId }),
  ]);

  await respond({
    text: `Effective mode: ${MODES[effective]}`,
    blocks: buildShowBlocks(wsStored, chStored, effective),
    response_type: 'ephemeral',
  });
}

async function handleSet(
  client: WebClient,
  respond: RespondFn,
  triggerId: string,
  {
    workspaceId,
    channelId,
    userId,
    scope,
    mode,
  }: {
    workspaceId: string;
    channelId: string;
    userId: string;
    scope: ModeScope | null;
    mode: ResponseMode | undefined;
  }
): Promise<void> {
  if (mode) {
    const resolvedScope = scope ?? 'channel';
    const id = resolvedScope === 'workspace' ? workspaceId : channelId;

    if (resolvedScope === 'workspace' && !(await isAdmin(client, userId))) {
      await respond({
        text: 'only workspace admins can set the workspace mode.',
        response_type: 'ephemeral',
      });
      return;
    }
    if (
      resolvedScope === 'channel' &&
      restrictedChannels.some((c) => c.id === channelId) &&
      !(await isAdmin(client, userId))
    ) {
      await respond({
        text: 'only workspace admins can change the mode in this channel.',
        response_type: 'ephemeral',
      });
      return;
    }

    await setMode({ scope: resolvedScope, id, mode });
    await respond({
      text: `${resolvedScope} mode set to ${MODES[mode]}`,
      blocks: [
        section(
          `*${resolvedScope === 'workspace' ? 'Workspace' : 'Channel'} mode set to* ${MODES[mode]}`
        ),
      ],
      response_type: 'ephemeral',
    });
    return;
  }

  const userIsAdmin = await isAdmin(client, userId);
  const defaultScope = scope ?? 'channel';
  await client.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'set_mode_modal',
      private_metadata: JSON.stringify({ workspaceId, channelId }),
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
                      text:
                        defaultScope === 'workspace' ? 'Workspace' : 'Channel',
                    },
                    value: defaultScope,
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

async function handleClear(
  client: WebClient,
  respond: RespondFn,
  {
    workspaceId,
    channelId,
    userId,
    scope,
  }: {
    workspaceId: string;
    channelId: string;
    userId: string;
    scope: ModeScope | null;
  }
): Promise<void> {
  const resolvedScope = scope ?? 'channel';
  const id = resolvedScope === 'workspace' ? workspaceId : channelId;

  if (resolvedScope === 'workspace' && !(await isAdmin(client, userId))) {
    await respond({
      text: 'only workspace admins can clear the workspace mode.',
      response_type: 'ephemeral',
    });
    return;
  }
  if (
    resolvedScope === 'channel' &&
    restrictedChannels.some((c) => c.id === channelId) &&
    !(await isAdmin(client, userId))
  ) {
    await respond({
      text: 'only workspace admins can change the mode in this channel.',
      response_type: 'ephemeral',
    });
    return;
  }

  await clearMode({ scope: resolvedScope, id });
  await respond({
    text:
      resolvedScope === 'workspace'
        ? 'workspace mode cleared'
        : 'channel mode cleared',
    blocks: [
      section(
        resolvedScope === 'workspace'
          ? 'workspace mode wiped. channels fall back to their own override, or relevance'
          : 'channel mode cleared. falls back to workspace default, or relevance'
      ),
    ],
    response_type: 'ephemeral',
  });
}

interface ParsedArgs {
  mode: ResponseMode | undefined;
  scope: ModeScope | null;
  subcommand: string | null;
}

function parseArgs(text: string): ParsedArgs {
  const [sub, second, third] = splitArgs(text);
  const secondLower = (second ?? '').toLowerCase();
  const scope = isScope(secondLower) ? secondLower : null;
  return {
    subcommand: sub?.toLowerCase() ?? null,
    scope,
    mode: (scope ? third : second) as ResponseMode | undefined,
  };
}

export async function execute(
  context: SlackCommandMiddlewareArgs & AllMiddlewareArgs
): Promise<void> {
  const { ack, body, command, client, respond } = context;

  await ack();

  const channelId = body.channel_id;
  const workspaceId = body.team_id;
  const userId = body.user_id;
  const { subcommand, scope, mode } = parseArgs(command.text ?? '');

  switch (subcommand) {
    case 'set': {
      await handleSet(client, respond, body.trigger_id, {
        workspaceId,
        channelId,
        userId,
        scope,
        mode,
      });
      break;
    }
    case 'show': {
      await showMode(workspaceId, channelId, scope, respond);
      break;
    }
    case 'clear': {
      await handleClear(client, respond, {
        workspaceId,
        channelId,
        userId,
        scope,
      });
      break;
    }
    default: {
      await showMode(workspaceId, channelId, null, respond);
    }
  }
}
