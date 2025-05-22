import {
  assistantThreadMessage,
  handleNewAssistantMessage,
} from "../lib/handle-messages";
import { waitUntil } from "@vercel/functions";
import { handleNewAppMention } from "../lib/handle-app-mention";
import { verifyRequest, getBotId } from "../lib/slack-utils";
import type { WebhookChatMessage, WebhookNotification } from "../types";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  await verifyRequest({ request, rawBody });

  try {
    const botUserId = await getBotId();

    const event = {
      type: request.headers.get('X-Discourse-Event-Type'),
      id: request.headers.get('X-Discourse-Event-Id')
    };

    console.log('got request', event.type)
    
    if (event.type === "notification" && payload.notification_type === 29) {
      waitUntil(handleNewAppMention(payload?.notification as WebhookNotification, botUserId));
    }

    // if (event.type === "assistant_thread_started") {
    //   waitUntil(assistantThreadMessage(event));
    // }

    if (
      event.type === "chat_message" &&
      payload?.chat_message.message.user.id !== botUserId
    ) {
      waitUntil(handleNewAssistantMessage(payload?.chat_message as WebhookChatMessage, botUserId));
    }

    return new Response("Success!", { status: 200 });
  } catch (error) {
    console.error("Error generating response", error);
    return new Response("Error generating response", { status: 500 });
  }
}
