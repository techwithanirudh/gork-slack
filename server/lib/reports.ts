import { generateText, Output } from 'ai';
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
} from '~/lib/kv';

export { userReportBlocks } from './slack/blocks';

export {
  sendBanLog,
  sendBanNotification,
  sendReportNotification,
  sendStrikeLog,
  sendUnbanLog,
  sendUnbanNotification,
} from './slack/notifications';

export async function validateReport(
  messageContent: string
): Promise<{ valid: boolean; reason: string }> {
  try {
    const { output } = await generateText({
      model: provider.languageModel('relevance-model'),
      output: Output.object({
        schema: contentFilterSchema,
      }),
      maxOutputTokens: 8192,
      prompt: contentFilterPrompt([messageContent]),
      temperature: 0.3,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'report-filter',
      },
    });

    return {
      valid: !output.safe,
      reason: output.reason,
    };
  } catch (error) {
    logger.error({ error, messageContent }, 'Report validation failed');
    return {
      valid: false,
      reason: 'Validation failed, report not counted',
    };
  }
}
