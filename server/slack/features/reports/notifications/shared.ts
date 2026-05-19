import type { KnownBlock } from '@slack/types';
import type { WebClient } from '@slack/web-api';
import { Actions, Button, Context } from 'slack-block-builder';
import { env } from '~/env';
import logger from '~/lib/logger';
import { asBlock } from '~/lib/slack/blocks';

export function slackDate(ms = Date.now()): string {
  return `<!date^${Math.floor(ms / 1000)}^{date_short_pretty} at {time}|${new Date(ms).toISOString()}>`;
}

export function infoButton(value: string) {
  return asBlock(
    Actions().elements(
      Button({ text: 'More Info', actionId: 'moderation_info' }).value(value)
    )
  );
}

export function footerBlock(ts: number) {
  return asBlock(
    Context().elements(
      `<!date^${ts}^{date_long_pretty} at {time}|${new Date(ts * 1000).toUTCString()}>`
    )
  );
}

export async function postLog(
  client: WebClient,
  text: string,
  blocks?: KnownBlock[]
): Promise<void> {
  if (!env.LOGS_CHANNEL) {
    return;
  }
  try {
    await client.chat.postMessage({ channel: env.LOGS_CHANNEL, text, blocks });
  } catch (error) {
    logger.warn({ error }, 'Failed to post to logs channel');
  }
}
