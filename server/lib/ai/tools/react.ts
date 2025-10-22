import { tool } from 'ai';
import { z } from 'zod';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

export const react = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Add emoji reactions to a Slack message. Provide emoji names without surrounding colons.',
    inputSchema: z.object({
      emojis: z
        .array(z.string().min(1))
        .nonempty()
        .describe('Emoji names to react with (unicode or custom names).'),
      id: z
        .string()
        .trim()
        .optional()
        .describe('Optional timestamp of the message to react to.'),
    }),
    execute: async ({ id, emojis }) => {
      const channelId = (context.event as { channel?: string }).channel;
      const messageTs = id ?? (context.event as { ts?: string }).ts;

      if (!channelId || !messageTs) {
        return { success: false, error: 'Missing Slack channel or message id' };
      }

      try {
        for (const emoji of emojis) {
          await context.client.reactions.add({
            channel: channelId,
            name: emoji.replace(/:/g, ''),
            timestamp: messageTs,
          });
        }

        logger.info(
          { channel: channelId, messageTs, emojis },
          'Added reactions',
        );

        return {
          success: true,
          content: `Added reactions: ${emojis.join(', ')}`,
        };
      } catch (error) {
        logger.error(
          { error, channel: channelId, messageTs, emojis },
          'Failed to add Slack reactions',
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
