import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import { loadingMessages } from '~/config';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

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
      status: active ? 'cooking...' : '',
      ...(active && { loading_messages: loadingMessages }),
    })
    .catch(() => undefined);
}

export type MessageEventArgs = SlackEventMiddlewareArgs<'message'> &
  AllMiddlewareArgs;

export function isProcessableMessage(
  args: MessageEventArgs
): SlackMessageContext | null {
  const { event, context, client, body } = args;

  if (
    event.subtype &&
    event.subtype !== 'thread_broadcast' &&
    event.subtype !== 'file_share'
  ) {
    return null;
  }

  if ('bot_id' in event && event.bot_id) {
    return null;
  }

  if (context.botUserId && event.user === context.botUserId) {
    return null;
  }

  if (!('text' in event)) {
    return null;
  }

  return {
    event: event as SlackMessageContext['event'],
    client,
    botUserId: context.botUserId,
    teamId:
      context.teamId ??
      (typeof body === 'object' && body
        ? (body as { team_id?: string }).team_id
        : undefined),
  } satisfies SlackMessageContext;
}

export async function getAuthorName(ctx: SlackMessageContext): Promise<string> {
  const { user: userId } = ctx.event;
  if (!userId) {
    return 'unknown';
  }
  try {
    const info = await ctx.client.users.info({ user: userId });
    return (
      info.user?.profile?.display_name ||
      info.user?.real_name ||
      info.user?.name ||
      userId
    );
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to fetch user info for logging');
    return userId;
  }
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
