import { AppMentionEvent } from "@slack/web-api";
import { client, getThread } from "./slack-utils";
import { generateResponse } from "./generate-response";
import { WebhookNotification } from "@/types";

const updateStatusUtil = async (
  initialStatus: string,
  event: WebhookNotification,
) => {
  const initialMessage = await client.postMessage({
    channel_id: event.data?.chat_channel_id as number,
    // thread_ts: event.thread_ts ?? event.ts,
    message: initialStatus,
  });

  if (!initialMessage || !initialMessage.id)
    throw new Error("Failed to post initial message");

  const updateMessage = async (status: string) => {
    await client.editMessage({
      channel_id: event.data?.chat_channel_id as number,
      message_id: initialMessage.id!,
      message: status,
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
