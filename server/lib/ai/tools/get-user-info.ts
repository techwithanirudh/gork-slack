import { tool } from 'ai';
import { z } from 'zod/v4';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';
import { normalizeSlackUserId } from '~/utils/users';

export const getUserInfo = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Get details about a Slack user by ID or exact username (display name).',
    inputSchema: z.object({
      userId: z
        .string()
        .min(1)
        .describe('The Slack user ID (e.g. U123) or exact display name.'),
    }),
    execute: async ({ userId }) => {
      try {
        const targetId = normalizeSlackUserId(userId);

        let user = null;

        if (targetId) {
          const info = await context.client.users.info({ user: targetId });
          user = info.user ?? null;
        }

        if (!user) {
          return {
            success: false,
            error: 'User not found. Use their Slack ID.',
          };
        }

        return {
          success: true,
          data: {
            id: user.id,
            username: user.name,
            displayName: user.profile?.display_name,
            realName: user.profile?.real_name,
            statusText: user.profile?.status_text,
            statusEmoji: user.profile?.status_emoji,
            isBot: user.is_bot,
            tz: user.tz,
            updated: user.updated,
            title: user.profile?.title,
            teamId: user.team_id,
            idResolved: targetId ?? null,
          },
        };
      } catch (error) {
        logger.error({ error }, 'Error in getUserInfo');
        return {
          success: false,
          error: 'Failed to fetch Slack user info',
        };
      }
    },
  });
