import { tool } from 'ai';
import { z } from 'zod';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';
import { getSlackUserName } from '~/utils/users';

interface SlackHistoryMessage {
  ts?: string;
  thread_ts?: string;
}

async function resolveTargetMessage(
  ctx: SlackMessageContext,
  offset: number,
): Promise<SlackHistoryMessage | null> {
  const channelId = (ctx.event as { channel?: string }).channel;
  const messageTs = (ctx.event as { ts?: string }).ts;

  if (!channelId || !messageTs) return null;

  if (offset <= 0) {
    return {
      ts: messageTs,
      thread_ts: (ctx.event as { thread_ts?: string }).thread_ts,
    };
  }

  const history = await ctx.client.conversations.history({
    channel: channelId,
    latest: messageTs,
    inclusive: false,
    limit: offset,
  });

  const sorted = ((history.messages ?? []) as SlackHistoryMessage[])
    .filter((msg) => Boolean(msg.ts))
    .sort((a, b) => Number(b.ts ?? '0') - Number(a.ts ?? '0'));

  return sorted[offset - 1] ?? { ts: messageTs };
}

function resolveThreadTs(
  target: SlackHistoryMessage | null,
  fallback?: string,
) {
  if (target?.thread_ts) return target.thread_ts;
  if (target?.ts) return target.ts;
  if (fallback) return fallback;
  return undefined;
}

export const reply = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Send messages to the Slack channel. Use type "reply" to respond in a thread or "message" for the main channel.',
    inputSchema: z.object({
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'Number of messages to go back from the triggering message. 0 or omitted means reply to the triggering message.',
        ),
      content: z
        .array(z.string())
        .nonempty()
        .describe(
          'Lines of text to send. Do NOT include trailing signatures; bots should sound natural.',
        ),
      type: z
        .enum(['reply', 'message'])
        .default('reply')
        .describe('Reply in a thread or post directly in the channel.'),
    }),
    execute: async ({ offset = 0, content, type }) => {
      const channelId = (context.event as { channel?: string }).channel;
      const messageTs = (context.event as { ts?: string }).ts;
      const currentThread = (context.event as { thread_ts?: string }).thread_ts;
      const userId = (context.event as { user?: string }).user;

      if (!channelId || !messageTs) {
        return { success: false, error: 'Missing Slack channel or timestamp' };
      }

      try {
        const target = await resolveTargetMessage(context, offset);
        const threadTs =
          type === 'reply'
            ? resolveThreadTs(target, currentThread ?? messageTs)
            : undefined;

        for (const text of content) {
          await context.client.chat.postMessage({
            channel: channelId,
            text,
            thread_ts: threadTs,
          });
        }

        const authorName = userId
          ? await getSlackUserName(context.client, userId)
          : 'unknown';

        logger.info(
          {
            channel: channelId,
            offset,
            type,
            author: authorName,
            content,
          },
          'Sent Slack reply',
        );

        return {
          success: true,
          content: 'Sent reply to Slack channel',
        };
      } catch (error) {
        logger.error(
          { error, channel: channelId, type, offset },
          'Failed to send Slack reply',
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
