import { AppMentionEvent } from "@slack/web-api";
import { client, getThread } from "./slack-utils";
import { generateResponse } from "./generate-response";

const updateStatusUtil = async (
  initialStatus: string,
  event: AppMentionEvent,
) => {
  const initialMessage = await client.postMessage({
    channel_id: event.channel,
    // thread_ts: event.thread_ts ?? event.ts,
    message: initialStatus,
  });

  if (!initialMessage || !initialMessage.ts)
    throw new Error("Failed to post initial message");

  const updateMessage = async (status: string) => {
    await client.editMessage({
      channel_id: event.channel,
      // ts: initialMessage.ts as string,
      message: status,
    });
  };
  return updateMessage;
};

export async function handleNewAppMention(
  event: AppMentionEvent,
  botUserId: string,
) {
  console.log("Handling app mention");
  if (event.bot_id || event.bot_id === botUserId || event.bot_profile) {
    console.log("Skipping app mention");
    return;
  }

  const { thread_ts, channel } = event;
  const updateMessage = await updateStatusUtil("is thinking...", event);

  if (thread_ts) {
    const messages = await getThread(channel, thread_ts, botUserId);
    const result = await generateResponse(messages, updateMessage);
    await updateMessage(result);
  } else {
    const result = await generateResponse(
      [{ role: "user", content: event.text }],
      updateMessage,
    );
    await updateMessage(result);
  }
}
