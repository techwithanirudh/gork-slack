import { tool } from 'ai';
import { z } from 'zod';
import logger from '~/lib/logger';
import { addReport, validateReport } from '~/lib/reports';
import type { SlackMessageContext } from '~/types';

const BAN_THRESHOLD = 15;

export const report = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Report a user for inappropriate/suggestive content violations. Only use for genuine SFW violations.',
    inputSchema: z.object({
      userId: z.string().describe('The Slack user ID to report'),
      reason: z.string().describe('Brief description of the violation'),
      messageContent: z
        .string()
        .describe('The actual message content that violated rules'),
    }),
    execute: async ({ userId, reason, messageContent }) => {
      const channelId = (context.event as { channel?: string }).channel;
      const messageTs = (context.event as { ts?: string }).ts;
      const currentThread = (context.event as { thread_ts?: string }).thread_ts;

      if (!channelId) {
        return { success: false, error: 'Missing Slack channel' };
      }

      try {
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
        const isBanned = reportCount >= BAN_THRESHOLD;

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
                    : `You have ${reportCount} report(s) in the last 30 days. ${BAN_THRESHOLD - reportCount} more will result in a ban.`,
                },
              ],
            },
          ],
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
