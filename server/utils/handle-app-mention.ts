import { editMessage, sendMessage } from '../../client/sdk.gen';
import type { GetSessionResponse } from '../../client/types.gen';
import type { WebhookNotification } from '~/types';
import { generateResponse } from './generate-response';
import { getMessages, getThreadMessages } from './discourse';
import logger from '~/lib/logger';

const updateStatusUtil = async (
  initialStatus: string,
  event: WebhookNotification,
  thread_id?: number | null,
) => {
  const res = await sendMessage({
    path: {
      channel_id: event.data?.chat_channel_id as number,
    },
    body: {
      message: initialStatus,
      thread_id: thread_id ?? undefined,
    },
  });

  if (!res?.data || !res.data?.message_id) {
    throw new Error(
      `Failed to post initial message, thread_id: ${thread_id}, ${JSON.stringify(res)}`,
    );
  }

  const initialMessage = res.data;

  const updateMessage = async (status: string) => {
    await editMessage({
      path: {
        channel_id: event.data?.chat_channel_id as number,
        message_id: initialMessage.message_id!,
      },
      body: {
        message: status,
      },
    });
  };
  return updateMessage;
};

export async function handleNewAppMention(
  event: WebhookNotification,
  botUser: GetSessionResponse['current_user'],
) {
  logger.info('Handling app mention');

  if (!botUser) return;
  if (event.data?.mentioned_by_username === botUser.username) {
    logger.info('Skipping app mention');
    return;
  }

  const { chat_channel_id: channel_id } = event?.data;
  const thread_id = (event?.data?.chat_thread_id as number) ?? undefined;
  const updateMessage = await updateStatusUtil(
    'is thinking...',
    event,
    thread_id,
  );

  // if (thread_ts) {
  const messages = thread_id
    ? await getThreadMessages(channel_id as number, botUser, thread_id)
    : await getMessages(channel_id as number, botUser);
  const result = await generateResponse(messages, updateMessage);

  await updateMessage(result);
  // } else {
  //   const result = await generateResponse(
  //     [{ role: "user", content: event.text }],
  //     updateMessage,
  //   );
  //   await updateMessage(result);
  // }

  logger.info(`replied to ${event.data?.mentioned_by_username}: ${result}`);
}
