import logger from '~/lib/logger';
import type { WebhookNotification } from '~/types';
import type { GetSessionResponse } from '~~/client/types.gen';
import { getMessages, getThreadMessages, updateStatus } from '~/utils/discourse';
import { generateResponse } from '~/utils/generate-response';

export const name = 'notification';
export const once = false;

export async function execute(
  payload: WebhookNotification,
  botUser: GetSessionResponse['current_user'],
) {
  logger.info('Handling app mention');

  if (!botUser) return;
  if (!(payload?.notification_type === 29 && payload?.user_id === botUser.id)) return;
  if (payload.data?.mentioned_by_username === botUser.username) {
    logger.info('Skipping app mention');
    return;
  }

  const { chat_channel_id: channel_id } = payload?.data;
  const thread_id = (payload?.data?.chat_thread_id as number) ?? undefined;
  const updateMessage = await updateStatus(
    'is thinking...',
    channel_id as number,
    thread_id,
  );

  const messages = thread_id
    ? await getThreadMessages(channel_id as number, botUser, thread_id)
    : await getMessages(channel_id as number, botUser);
  const result = await generateResponse(messages, updateMessage);

  await updateMessage(result);

  logger.info(`replied to ${payload.data?.mentioned_by_username}: ${result}`);
}
