import type { App, GenericMessageEvent } from '@slack/bolt';
import { keywords } from '~/config';
import { ratelimit, redisKeys } from '~/lib/kv';
import logger from '~/lib/logger';
import { generateResponse } from '~/utils/generate-response';
import { reply } from '~/utils/staggered-response';
import { getConversationMessages } from '../conversations';

function shouldRespond(event: GenericMessageEvent, botUserId?: string): boolean {
  const text = event.text ?? '';
  const isDM = event.channel_type === 'im';

  if (isDM) {
    return true;
  }

  const hasKeyword = keywords.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase()),
  );

  const mentionRegex = botUserId ? new RegExp(`<@${botUserId}>`, 'gi') : null;
  const isMentioned = mentionRegex ? mentionRegex.test(text) : false;

  return hasKeyword || isMentioned;
}

export function registerMessageEvents(app: App): void {
  app.event('message', async ({ event, client, context }) => {
    const message = event as GenericMessageEvent;

    if (message.subtype) return;
    if (!message.text) return;
    if (message.bot_id) return;
    if (message.user === context.botUserId) return;
    if (!message.user) return;

    if (!shouldRespond(message, context.botUserId)) {
      return;
    }

    const contextId = message.channel_type === 'im'
      ? `dm:${message.user}`
      : message.channel;

    const { success } = await ratelimit.limit(redisKeys.channelCount(contextId));
    if (!success) {
      logger.info({ contextId }, 'Rate limit reached, skipping response');
      return;
    }

    try {
      const threadTs = message.thread_ts ?? message.ts;
      const history = await getConversationMessages({
        client,
        channel: message.channel,
        threadTs,
        botUserId: context.botUserId,
      });

      const response = await generateResponse(history);

      await reply({
        client,
        channel: message.channel,
        text: response,
        threadTs,
      });

      logger.info(
        {
          channel: message.channel,
          threadTs,
          user: message.user,
        },
        'Sent Slack response',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to handle Slack message');
    }
  });
}
