import type { App } from '@slack/bolt';
import { env } from '~/env';
import logger from './logger';

const allowedUsers = new Set<string>();

export async function buildCache(app: App) {
  if (!env.OPT_IN_CHANNEL) return;

  app.event('member_joined_channel', async ({ event }) => {
    if (event.channel !== env.OPT_IN_CHANNEL) return;
    allowedUsers.add(event.user);
  });

  app.event('member_left_channel', async ({ event }) => {
    if (event.channel !== env.OPT_IN_CHANNEL) return;
    allowedUsers.delete(event.user);
  });

  let cursor: string | undefined;
  do {
    const req = await app.client.conversations.members({
      channel: env.OPT_IN_CHANNEL,
      limit: 200,
      cursor,
    });
    if (!req.ok)
      throw logger.error({ error: req.error }, 'Error building opt-in cache');
    cursor = req.response_metadata?.next_cursor;
    if (!req.members) continue;
    for (const member of req.members) allowedUsers.add(member);
  } while (cursor);
}

export function isUserAllowed(userId: string) {
  if (!env.OPT_IN_CHANNEL) return true;
  return allowedUsers.has(userId);
}
