import {
  generateResponse,
  getMessages,
  getThreadMessages,
  updateStatusUtil,
} from '#imports';
import { keywords } from '~/config';
import logger from '~/lib/logger';
import { WebhookChatMessage } from '~/types';
import { GetSessionResponse } from '~~/client';

export const name = 'chat_message';
export const once = false;

export async function execute(
  payload: WebhookChatMessage,
  botUser: GetSessionResponse['current_user'],
) {
  if (!botUser || payload.message.user.id === botUser.id) return;

  const { channel } = payload;
  const { message: content } = payload.message;
  const thread_id = payload.message.thread_id ?? null;

  const isDM = channel.chatable_type === 'DirectMessage';
  const myDMId = botUser.custom_fields?.last_chat_channel_id;
  const isOwnDM = isDM && channel.id === myDMId;
  const hasKeyword = keywords.some((kw) =>
    content.toLowerCase().includes(kw.toLowerCase()),
  );

  if (isDM && !isOwnDM) return;

  if (!isDM && !hasKeyword) return;

  logger.info('processing AI request from chat message');

  const updateStatus = await updateStatusUtil(
    'is thinking...',
    payload,
    thread_id,
  );

  const messages = thread_id
    ? await getThreadMessages(channel.id as number, botUser, thread_id)
    : await getMessages(channel.id as number, botUser);
  const result = await generateResponse(messages, updateStatus);
  await updateStatus(result);

  logger.info(`replied to ${payload.message.user.username}: ${result}`);
}
