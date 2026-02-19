import { tool } from 'ai';
import { z } from 'zod';
import { leaveChannelBlocklist } from '~/config';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

export const leaveChannel = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Leave the channel you are currently in. Use this carefully and only if the user asks. If the user asks you to leave a channel, you MUST run this tool.',
    inputSchema: z.object({
      reason: z
        .string()
        .optional()
        .describe('Optional short reason for leaving'),
    }),
    execute: async ({ reason }) => {
      const channel = context.event.channel;
      const blocked = leaveChannelBlocklist.find((c) => c.id === channel);
      if (blocked) {
        logger.info(
          { channel, name: blocked.name },
          'Blocked from leaving channel'
        );
        return {
          success: false,
          error: `Cannot leave #${blocked.name} — this channel is protected.`,
        };
      }

      const authorId = (context.event as { user?: string }).user;
      logger.info({ reason, authorId, channel }, 'Leaving channel');

      try {
        await context.client.conversations.leave({
          channel,
        });
      } catch (error) {
        logger.error({ error, channel }, 'Failed to leave channel');
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      return {
        success: true,
      };
    },
  });
