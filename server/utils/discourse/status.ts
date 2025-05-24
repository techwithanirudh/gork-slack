import { editMessage, sendMessage } from '~~/client/sdk.gen';
import { client } from './client';

export const updateStatus = async (
  initialStatus: string,
  channel_id: number,
  thread_id?: number | null,
) => {
  const res = await sendMessage({
    client,
    path: {
      channel_id: channel_id,
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
      client,
      path: {
        channel_id: channel_id,
        message_id: initialMessage.message_id!,
      },
      body: {
        message: status,
      },
    });
  };
  return updateMessage;
};
