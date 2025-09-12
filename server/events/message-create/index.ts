import { reply } from '~/utils/staggered-response';
import { keywords } from '~/config';
import logger from '~/lib/logger';
import type { WebhookChatMessage } from '~/types';
import { getMessages, getThreadMessages } from '~/lib/discourse';
import { updateStatus } from '~/lib/discourse';
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
  const isMember = Boolean(channel.current_user_membership);
  // Note: In some environments, 'current_user_membership' may be missing.
  // TODO: If this is consistently undefined, implement an API-based membership check to verify bot membership before responding.

  const ctxId = isDM ? `dm:${message.user?.id}` : `${channel.id}`;

  const replyAllowed = (await ratelimit.limit(redisKeys.channelCount(ctxId)))
    .success;
  if (!replyAllowed) {
    logger.info(`Message Limit tripped in ${ctxId}`);
    return;
  }


  const hasKeyword = keywords.some((kw) =>
    content.toLowerCase().includes(kw.toLowerCase()),
  );
  const isMentioned = content.includes(`<@${botUser.username}>`);

  logger.info(
    { ctxId, user: user.username, isDM, isMember, isMentioned, hasKeyword, content },
    "Incoming message"
  );

  if (isDM && !isMember) {
    logger.info({ ctxId, user: user.username, isDM, isMember }, "Ignoring DM: bot not a member or membership unknown");
    return;
  }

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
