import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { loadingMessages } from '~/config';
import logger from '~/lib/logger';
import type {
  ProcessableSlackMessageEvent,
  SlackMessageContext,
} from '~/types';
export function setThreadStatus({
  ctx,
  active,
}: {
  ctx: SlackMessageContext;
  active: boolean;
}): void {
  const { channel, ts, thread_ts } = ctx.event;
  const threadTs = ts ? (thread_ts ?? ts) : undefined;
  if (!(channel && threadTs)) {
    return;
  }
  ctx.client.assistant.threads
    .setStatus({
      channel_id: channel,
      thread_ts: threadTs,
      status: active ? (loadingMessages[0] ?? '') : '',
      ...(active && { loading_messages: loadingMessages }),
    })
    // Slack may reject status updates outside assistant-managed threads.
    .catch((error) =>
      logger.debug({ error, channel, threadTs }, 'Failed to set thread status')
    );
}

export type MessageEventArgs = SlackEventMiddlewareArgs<'message'> &
  AllMiddlewareArgs;

function isProcessableEvent(
  event: MessageEventArgs['event']
): event is ProcessableSlackMessageEvent {
  if (
    event.subtype &&
    event.subtype !== 'thread_broadcast' &&
    event.subtype !== 'file_share'
  ) {
    return false;
  }

  if ('bot_id' in event && event.bot_id) {
    return false;
  }

  return 'text' in event;
}

export function isProcessableMessage(
  args: MessageEventArgs
): SlackMessageContext | null {
  const { event, context, client, body } = args;

  if (!isProcessableEvent(event)) {
    return null;
  }

  if (context.botUserId && event.user === context.botUserId) {
    return null;
  }

  return {
    event,
    client,
    botUserId: context.botUserId,
    teamId: context.teamId ?? body.team_id,
  } satisfies SlackMessageContext;
}

export function getContextId(ctx: SlackMessageContext): string {
  const channel = ctx.event.channel ?? 'unknown-channel';
  const {
    channel_type: channelType,
    user: userId,
    thread_ts: threadTs,
  } = ctx.event;

  if (channelType === 'im' && userId) {
    return `dm:${userId}`;
  }
  if (threadTs) {
    return `${channel}:${threadTs}`;
  }
  return channel;
}
