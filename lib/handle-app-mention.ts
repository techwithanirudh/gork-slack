import { getThread } from './slack-utils';
import { generateResponse } from './generate-response';
import type { WebhookNotification } from '../types';
import { editMessage, sendMessage } from '../client/sdk.gen';
import { GetSessionResponse } from '../client/types.gen';

const updateStatusUtil = async (
  initialStatus: string,
  event: WebhookNotification,
) => {
  const res = await sendMessage({
    path: {
      channel_id: event.data?.chat_channel_id as number,
    },
    // thread_ts: event.thread_ts ?? event.ts,
    body: {
      message: initialStatus,
    },
  });

  if (!res?.data || !res.data?.message_id)
    throw new Error('Failed to post initial message');
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
  console.log('Handling app mention');

  if (!botUser) return;
  if (event.data?.mentioned_by_username === botUser.username) {
    console.log('Skipping app mention');
    return;
  }

  const { chat_channel_id: channel_id } = event?.data;
  const updateMessage = await updateStatusUtil('is thinking...', event);

  // if (thread_ts) {
  const messages = await getThread(channel_id as any, botUser);
  const result = await generateResponse(messages, updateMessage);
  await updateMessage(result);
  // } else {
  //   const result = await generateResponse(
  //     [{ role: "user", content: event.text }],
  //     updateMessage,
  //   );
  //   await updateMessage(result);
  // }
}
