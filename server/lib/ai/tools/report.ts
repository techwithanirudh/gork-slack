import { tool } from 'ai';
import { z } from 'zod';
import { moderation } from '~/config';
import logger from '~/lib/logger';
import {
  addReport,
  sendReportNotification,
  validateReport,
} from '~/lib/reports';
import { getConversationMessages } from '~/slack/conversations';
import type { SlackMessageContext } from '~/types';
import { buildHistorySnippet } from '~/utils/messages';

export const report = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Report the current user for sexual/NSFW content violations. ONLY use this for genuine sexual content requests. This reports the user who sent the triggering message.',
    inputSchema: z.object({
      reason: z.string().describe('Brief description of the violation'),
    }),
    execute: async ({ reason }) => {
      const channelId = context.event.channel;
      const messageTs = (context.event as { ts?: string }).ts;
      const currentThread = (context.event as { thread_ts?: string }).thread_ts;
      const userId = (context.event as { user?: string }).user;

      if (!(channelId && messageTs)) {
        return { success: false, error: 'Missing Slack channel or timestamp' };
      }

      if (!userId) {
        return { success: false, error: 'Missing user ID from context' };
      }

      try {
        const allMessages = await getConversationMessages({
          client: context.client,
          channel: channelId,
          threadTs: currentThread,
          botUserId: context.botUserId,
          limit: 50,
          latest: messageTs,
          inclusive: true,
        });

        const userMessages = allMessages
          .filter((msg) => {
            const content = typeof msg.content === 'string' ? msg.content : '';
            return content.includes(`(${userId})`);
          })
          .slice(-moderation.contextMessages);

        if (userMessages.length === 0) {
          logger.info(
            { userId, reason, channelId },
            'Report rejected: no messages found from user'
          );
          return {
            success: false,
            error: 'No recent messages found from user to validate',
          };
        }

        const messageContent = buildHistorySnippet(
          userMessages,
          moderation.contextMessages
        );

        const validation = await validateReport(messageContent);
        if (!validation.valid) {
          logger.info(
            { userId, reason, validationReason: validation.reason },
            'Report rejected by validation'
          );
          return {
            success: false,
            error: `Report not validated: ${validation.reason}`,
          };
        }

        const reportCount = await addReport(userId, reason);
        const isBanned = reportCount >= moderation.banThreshold;

        const threadTs = currentThread ?? messageTs;
        await context.client.chat.postMessage({
          channel: channelId,
          text: 'Warning: You have been reported for inappropriate content.',
          thread_ts: threadTs,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: isBanned
                  ? ':no_entry: *You have been banned from Gork*'
                  : ':warning: *Content Warning*',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `You have been reported for inappropriate content.\n\n*Reason:* ${reason}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: isBanned
                    ? `You have ${reportCount} report(s) in the last 30 days. You are now banned from using Gork.`
                    : `You have ${reportCount} report(s) in the last 30 days. ${moderation.banThreshold - reportCount} more will result in a ban.`,
                },
              ],
            },
          ],
        });

        await sendReportNotification({
          client: context.client,
          userId,
          channelId,
          messageTs,
          reason,
          reportCount,
          isBanned,
        });

        logger.info(
          { userId, reason, reportCount, channelId },
          'User reported successfully'
        );

        return {
          success: true,
          reportCount,
          isBanned,
          message: isBanned
            ? 'User has been banned'
            : `Report recorded. User has ${reportCount} report(s)`,
        };
      } catch (error) {
        logger.error({ error, userId, reason }, 'Failed to report user');
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
