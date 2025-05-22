import type {
  AssistantThreadStartedEvent,
  GenericMessageEvent,
} from "@slack/web-api";
import { client, getThread, updateStatusUtil } from "./slack-utils";
import { generateResponse } from "./generate-response";
import { WebhookChatMessage } from "@/types";

export async function assistantThreadMessage(
  event: AssistantThreadStartedEvent,
) {
  const { channel_id, thread_ts } = event.assistant_thread;
  console.log(`Thread started: ${channel_id} ${thread_ts}`);
  console.log(JSON.stringify(event));

  await client.postMessage({
    channel_id: channel_id as any,
    // thread_ts: thread_ts,
    message: "Hello, I'm an AI assistant built with the AI SDK by Vercel!",
  });

  // await client.assistant.threads.setSuggestedPrompts({
  //   channel_id: channel_id,
  //   thread_ts: thread_ts,
  //   prompts: [
  //     {
  //       title: "Get the weather",
  //       message: "What is the current weather in London?",
  //     },
  //     {
  //       title: "Get the news",
  //       message: "What is the latest Premier League news from the BBC?",
  //     },
  //   ],
  // });
}

export async function handleNewAssistantMessage(
  event: WebhookChatMessage,
  botUserId: number,
) {
  if (
    event.message.user.id === botUserId
  )
    return;

  const { channel } = event;

  const updateStatus = updateStatusUtil(channel.id);
  await updateStatus("is thinking...");

  const messages = await getThread(channel.id, botUserId);
  const result = await generateResponse(messages, updateStatus);

  await client.postMessage({
    channel_id: channel.id,
    // thread_ts: thread_ts,
    message: result,
    // unfurl_links: false,
    // blocks: [
    //   {
    //     type: "section",
    //     text: {
    //       type: "mrkdwn",
    //       text: result,
    //     },
    //   },
    // ],
  });

  await updateStatus("");
}
