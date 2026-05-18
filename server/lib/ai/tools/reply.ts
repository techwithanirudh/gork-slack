import { tool } from 'ai';
import { z } from 'zod';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';
import { getGroupMentions } from '~/utils/blocks';
import { getSlackUserName } from '~/utils/users';

interface SlackHistoryMessage {
  thread_ts?: string;
  ts?: string;
}

async function resolveTargetMessage(
  ctx: SlackMessageContext,
  offset: number
): Promise<SlackHistoryMessage | null> {
  const { channel: channelId, ts: messageTs, thread_ts } = ctx.event;

  if (!(channelId && messageTs)) {
    return null;
  }

  if (offset <= 0) {
    return { ts: messageTs, thread_ts };
  }

  const history = await ctx.client.conversations.history({
    channel: channelId,
    latest: messageTs,
    inclusive: false,
    limit: offset,
  });

  if (!history.messages) {
    logger.error({ res: history }, 'Error fetching history');
  }

  // TODO: Integrate shouldUse with this to prevent offset mismatches
  const sorted = ((history.messages ?? []) as SlackHistoryMessage[])
    .filter((msg) => Boolean(msg.ts))
    .sort((a, b) => Number(b.ts ?? '0') - Number(a.ts ?? '0'));

  return sorted[offset - 1] ?? { ts: messageTs };
}

function resolveThreadTs(
  target: SlackHistoryMessage | null,
  fallback?: string
) {
  if (target?.thread_ts) {
    return target.thread_ts;
  }
  if (target?.ts) {
    return target.ts;
  }
  if (fallback) {
    return fallback;
  }
  return;
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
          `Number of messages to go back from the triggering message. 0 or omitted means that you will reply to the message that you were triggered by. This would usually stay as 0. ${context.event.thread_ts ? 'NOTE: YOU ARE IN A THREAD - THE OFFSET WILL RESPOND TO A DIFFERENT THREAD. Change the offset only if you are sure.' : ''}`.trim()
        ),
      content: z
        .array(z.string())
        .nonempty()
        .describe(
          'Lines of text to send. Do NOT include trailing signatures; bots should sound natural. Send at most 4 lines.'
        )
        .max(4),
      type: z
        .enum(['reply', 'message'])
        .default('reply')
        .describe('Reply in a thread or post directly in the channel.'),
    }),
    execute: async ({ offset = 0, content, type }) => {
      const {
        channel: channelId,
        ts: messageTs,
        thread_ts: currentThread,
        blocks,
        user: userId,
      } = context.event;
      const forceChannelReply =
        !currentThread && getGroupMentions(blocks).length > 0;

      if (!(channelId && messageTs)) {
        return { success: false, error: 'Missing Slack channel or timestamp' };
      }

      try {
        const effectiveType =
          forceChannelReply && !currentThread ? 'message' : type;
        const target = await resolveTargetMessage(context, offset);
        const threadTs =
          effectiveType === 'reply'
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
            type: effectiveType,
            author: authorName,
            content,
          },
          'Sent Slack reply'
        );

        return {
          success: true,
          content:
            effectiveType === type
              ? 'Sent reply to Slack channel'
              : `Sent reply to Slack channel (type overridden from "${type}" to "${effectiveType}")`,
        };
      } catch (error) {
        logger.error(
          { error, channel: channelId, type, offset },
          'Failed to send Slack reply'
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
