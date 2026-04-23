import type { WebClient } from '@slack/web-api';
import { env } from '~/env';
import logger from '~/lib/logger';

async function postLog(client: WebClient, text: string): Promise<void> {
  if (!(env.LOGS_CHANNEL && env.BAN_LOGS)) {
    return;
  }
  try {
    await client.chat.postMessage({ channel: env.LOGS_CHANNEL, text });
  } catch (error) {
    logger.warn({ error }, 'Failed to post to logs channel');
  }
}

interface StrikeLogParams {
  banThreshold: number;
  client: WebClient;
  isBanned: boolean;
  reason: string;
  reportCount: number;
  userId: string;
}

export async function sendStrikeLog({
  client,
  userId,
  reason,
  reportCount,
  banThreshold,
  isBanned,
}: StrikeLogParams): Promise<void> {
  if (isBanned) {
    await postLog(
      client,
      `:no_entry: <@${userId}> has been auto-banned after ${reportCount} strikes. Last reason: ${reason}`
    );
  } else {
    await postLog(
      client,
      `:warning: <@${userId}> received a strike (${reportCount}/${banThreshold}). Reason: ${reason}`
    );
  }
}

interface BanLogParams {
  adminId: string;
  client: WebClient;
  userId: string;
}

export async function sendBanLog({
  client,
  userId,
  adminId,
}: BanLogParams): Promise<void> {
  await postLog(
    client,
    `:hammer: <@${userId}> was manually banned by <@${adminId}>`
  );
}

interface UnbanLogParams {
  adminId: string;
  client: WebClient;
  userId: string;
}

export async function sendUnbanLog({
  client,
  userId,
  adminId,
}: UnbanLogParams): Promise<void> {
  await postLog(
    client,
    `:white_check_mark: <@${userId}> was unbanned by <@${adminId}>`
  );
}
