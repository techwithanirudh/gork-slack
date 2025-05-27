import { reply } from '~/utils/staggered-response';
import { keywords } from '~/config';
import logger from '~/lib/logger';
import type { WebhookChatMessage } from '~/types';
import { getMessages, getThreadMessages } from '~/utils/discourse';
import { updateStatus } from '~/utils/discourse';
import { generateResponse } from '~/utils/generate-response';
import type { GetSessionResponse } from '~~/client';
import { ratelimit, redisKeys } from '~/lib/kv';

export const name = 'chat_message';
export const once = false;

export async function execute(
  payload: WebhookChatMessage,
  botUser: GetSessionResponse['current_user'],
) {
  if (!botUser || payload.message.user.id === botUser.id) return;

  const { channel, message } = payload;
  const { message: content, user } = payload.message;
  const thread_id = payload.message.thread_id ?? null;

  const isDM = channel.chatable_type === 'DirectMessage';
  const myDMId = botUser.custom_fields?.last_chat_channel_id;

  const ctxId = isDM ? `dm:${message.user?.id}` : `${channel.id}`;

  const replyAllowed = (await ratelimit.limit(redisKeys.channelCount(ctxId)))
    .success;
  if (!replyAllowed) {
    logger.info(`Message Limit tripped in ${ctxId}`);
    return;
  }

  const isOwnDM = isDM && channel.id === myDMId;
  const hasKeyword = keywords.some((kw) =>
    content.toLowerCase().includes(kw.toLowerCase()),
  );
  const isMentioned = content.includes(`<@${botUser.username}>`);

  logger.info(
    { ctxId, user: user.username, isMentioned, hasKeyword, content, isOwnDM },
    "Incoming message"
  );

  if (isDM && !isOwnDM) return;

  if (!isDM && !hasKeyword && !isMentioned) return;

  // const updateMessage = await updateStatus(
  //   'bro',
  //   payload?.channel?.id,
  //   thread_id,
  // );

  const messages = thread_id
    ? await getThreadMessages(channel.id as number, botUser, thread_id)
    : await getMessages(channel.id as number, botUser);
  const result = await generateResponse(messages);
  await reply(result, payload?.channel.id, thread_id);

  logger.info(`replied to ${payload.message.user.username}: ${result}`);
}
