import { keywords } from '~/config';
import logger from '~/lib/logger';
import type { WebhookChatMessage } from '~/types';
import { getMessages, getThreadMessages } from '~/utils/discourse';
import { updateStatus } from '~/utils/discourse';
import { generateResponse } from '~/utils/generate-response';
import type { GetSessionResponse } from '~~/client';

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
  const isMentioned = content.includes(`<@${botUser.username}>`);

  if (isDM && !isOwnDM) return;

  if (!isDM && !hasKeyword && !isMentioned) return;

  logger.info('processing AI request from chat message');

  const updateMessage = await updateStatus(
    'bro',
    payload?.channel?.id,
    thread_id,
  );

  const messages = thread_id
    ? await getThreadMessages(channel.id as number, botUser, thread_id)
    : await getMessages(channel.id as number, botUser);
  const result = await generateResponse(messages, updateMessage);
  await updateMessage('bro' + result);

  logger.info(`replied to ${payload.message.user.username}: ${result}`);
}
