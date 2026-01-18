import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import logger from '~/lib/logger';
import { getReportCount, isAdmin, removeReport } from '~/lib/reports';

interface RemoveReportValue {
  userId: string;
  reportId: string;
}

export async function removeReportAction({
  ack,
  action,
  respond,
  body,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs) {
  await ack();

  if (!isAdmin(body.user.id)) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'You do not have permission to perform this action.',
    });
    return;
  }

  const valueStr = action.value;

  if (!valueStr) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'Error: No report data provided.',
    });
    return;
  }

  let value: RemoveReportValue;
  try {
    value = JSON.parse(valueStr);
  } catch {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'Error: Invalid report data.',
    });
    return;
  }

  const removed = await removeReport(value.userId, value.reportId);

  if (!removed) {
    await respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'Report not found or already removed.',
    });
    return;
  }

  const remainingCount = await getReportCount(value.userId);

  await respond({
    response_type: 'ephemeral',
    replace_original: false,
    text: `Report removed by <@${body.user.id}>. <@${value.userId}> now has ${remainingCount} report(s).`,
  });

  logger.info(
    { userId: value.userId, reportId: value.reportId, removedBy: body.user.id },
    'Report removed via button action'
  );
}
