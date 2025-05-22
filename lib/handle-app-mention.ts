import { getThread } from "./slack-utils";
import { generateResponse } from "./generate-response";
import type { WebhookNotification } from "../types";
import { editMessage, postMessage } from "../client/sdk.gen";

const updateStatusUtil = async (
  initialStatus: string,
  event: WebhookNotification,
) => {
  const res = await postMessage({
    path: {
      channel_id: event.data?.chat_channel_id as number,
    },
    // thread_ts: event.thread_ts ?? event.ts,
    body: {
      message: initialStatus,
    },
  });

  // @ts-expect-error the types for this are broken
  if (!res?.data || !res.data?.message_id)
    throw new Error("Failed to post initial message");
  const initialMessage = res.data;

  const updateMessage = async (status: string) => {
    await editMessage({
      path: {
        channel_id: event.data?.chat_channel_id as number,
        // @ts-expect-error the types for this are broken
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
  botUserId: number,
) {
  console.log("Handling app mention");
  if (event.user_id === botUserId) {
    console.log("Skipping app mention");
    return;
  }

  const { chat_channel_id: channel_id } = event?.data;
  const updateMessage = await updateStatusUtil("is thinking...", event);

  // if (thread_ts) {
  const messages = await getThread(channel_id as any, botUserId);
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
