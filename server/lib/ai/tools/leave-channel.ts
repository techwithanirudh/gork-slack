import { tool } from 'ai';
import { z } from 'zod';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

export const leaveChannel = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Leave the channel you are currently in. Use this carefully and only if the user asks.',
    inputSchema: z.object({
      reason: z
        .string()
        .optional()
        .describe('Optional short reason for leaving'),
    }),
    execute: async ({ reason }) => {
      const authorId = (context.event as { user?: string }).user;
      logger.info(
        { reason, authorId, channel: context.event.channel },
        'Leaving channel',
      );
      await context.client.conversations.leave({
        channel: context.event.channel,
      });

      return {
        success: true,
      };
    },
  });
