import { tool } from 'ai';
import { z } from 'zod/v4';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';
import { getSlackUserName, normalizeSlackUserId } from '~/utils/users';

export const startDM = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description: 'Start a DM with a Slack user and send them a message.',
    inputSchema: z.object({
      userId: z.string().min(1).describe('Slack user ID (e.g. U123).'),
      content: z.string().min(1).describe('Message content to send in the DM.'),
    }),
    execute: async ({ userId, content }) => {
      try {
        const targetId = normalizeSlackUserId(userId);

        if (!targetId.startsWith('U')) {
          return {
            success: false,
            error: 'User not found. Provide a Slack user ID.',
          };
        }

        const dm = await context.client.conversations.open({ users: targetId });
        const channelId = dm.channel?.id;

        if (!channelId) {
          return {
            success: false,
            error: 'Failed to open direct message with user.',
          };
        }

        await context.client.chat.postMessage({
          channel: channelId,
          text: content,
        });

        const authorId = (context.event as { user?: string }).user;
        const authorName = authorId
          ? await getSlackUserName(context.client, authorId)
          : 'unknown';
        const targetName = await getSlackUserName(context.client, targetId);

        logger.info(
          {
            author: authorName,
            targetId,
            content,
          },
          'Sent Slack DM',
        );

        return {
          success: true,
          content: `Sent DM to ${targetName}`,
          userId: targetId,
          messageContent: content,
        };
      } catch (error) {
        logger.error({ error }, 'Failed to start Slack DM');
        return {
          success: false,
          error: 'Failed to send Slack DM',
        };
      }
    },
  });
