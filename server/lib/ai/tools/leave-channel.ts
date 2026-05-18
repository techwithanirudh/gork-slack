import { tool } from 'ai';
import { z } from 'zod';
import { restrictedChannels } from '~/config';
import { env } from '~/env';
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
      const { channel, user: triggerUserId } = context.event;
      const blocked = restrictedChannels.find((c) => c.id === channel);
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

      logger.info({ reason, triggerUserId, channel }, 'Leaving channel');

      if (env.LOGS_CHANNEL) {
        try {
          await context.client.chat.postMessage({
            channel: env.LOGS_CHANNEL,
            text: triggerUserId
              ? `<@${triggerUserId}> asked the bot to leave <#${channel}>`
              : `The bot was asked to leave <#${channel}>`,
          });
        } catch (error) {
          logger.error(
            { error, channel, triggerUserId },
            'Failed to send leave-channel trigger notification'
          );
        }
      }

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
