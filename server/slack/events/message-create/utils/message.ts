import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

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
  const userId = (ctx.event as { user?: string }).user;
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
  const channelType = ctx.event.channel_type;
  const userId = (ctx.event as { user?: string }).user;
  const threadTs = (ctx.event as { thread_ts?: string }).thread_ts;

  if (channelType === 'im' && userId) {
    return `dm:${userId}`;
  }
  if (threadTs) {
    return `${channel}:${threadTs}`;
  }
  return channel;
}
