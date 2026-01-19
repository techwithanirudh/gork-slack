import { generateObject } from 'ai';
import { env } from '~/env';
import { contentFilterPrompt } from '~/lib/ai/prompts/tasks';
import { provider } from '~/lib/ai/providers';
import { contentFilterSchema } from '~/lib/validators';
import logger from './logger';

export {
  addReport,
  banUser,
  getReportCount,
  getUserReports,
  isUserBanned,
  type Report,
  removeReport,
  unbanUser,
} from './queries/reports';

export { userReportBlocks } from './slack/blocks';

export {
  sendBanNotification,
  sendReportNotification,
  sendUnbanNotification,
} from './slack/notifications';

const adminUserIds = new Set(env.ADMINS ?? []);

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}

export async function validateReport(
  messageContent: string
): Promise<{ valid: boolean; reason: string }> {
  try {
    const { object } = await generateObject({
      model: provider.languageModel('content-filter-model'),
      schema: contentFilterSchema,
      prompt: contentFilterPrompt([messageContent]),
      temperature: 0.3,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'report-filter',
      },
    });

    return {
      valid: !object.safe,
      reason: object.reason,
    };
  } catch (error) {
    logger.error({ error, messageContent }, 'Report validation failed');
    return {
      valid: false,
      reason: 'Validation failed, report not counted',
    };
  }
}
