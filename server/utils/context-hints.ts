import { locale } from '~/config';
import type { RequestHints, SlackMessageContext } from '~/types';
import { getTimeInCity } from '~/utils/time';

async function resolveChannelName(ctx: SlackMessageContext): Promise<string> {
  const channelId = ctx.event.channel;
  if (!channelId) {
    return 'Unknown channel';
  }

  try {
    const info = await ctx.client.conversations.info({ channel: channelId });
    const channel = info.channel;
    if (!channel) {
      return channelId;
    }
    if (channel.is_im) {
      return 'Direct Message';
    }
    return channel.name_normalized ?? channel.name ?? channelId;
  } catch {
    return channelId;
  }
}

async function resolveServerName(ctx: SlackMessageContext): Promise<string> {
  try {
    const info = await ctx.client.team.info();
    return info.team?.name ?? 'Slack Workspace';
  } catch {
    return 'Slack Workspace';
  }
}

async function resolveBotDetails(
  ctx: SlackMessageContext
): Promise<{ joined: number; status: string; activity: string }> {
  const botId = ctx.botUserId;
  if (!botId) {
    return { joined: Date.now(), status: 'active', activity: 'none' };
  }

  try {
    const info = await ctx.client.users.info({ user: botId });
    const joinedSeconds = info.user?.updated ?? Math.floor(Date.now() / 1000);
    const status =
      info.user?.profile?.status_text?.trim() ||
      info.user?.profile?.status_emoji?.trim() ||
      'active';
    return {
      joined: joinedSeconds * 1000,
      status,
      activity: info.user?.profile?.status_text?.trim() || 'none',
    };
  } catch {
    return { joined: Date.now(), status: 'active', activity: 'none' };
  }
}

export async function buildRequestHints(
  ctx: SlackMessageContext
): Promise<RequestHints> {
  const [channelName, serverName, botDetails] = await Promise.all([
    resolveChannelName(ctx),
    resolveServerName(ctx),
    resolveBotDetails(ctx),
  ]);

  return {
    channel: channelName,
    time: getTimeInCity(locale.timezone),
    city: locale.city,
    country: locale.country,
    server: serverName,
    joined: botDetails.joined,
    status: botDetails.status,
    activity: botDetails.activity,
  };
}
