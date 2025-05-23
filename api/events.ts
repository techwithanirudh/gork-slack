import { waitUntil } from '@vercel/functions';
import { handleNewAppMention } from '../lib/handle-app-mention';
import { handleNewAssistantMessage } from '../lib/handle-messages';
import { getBotUser, verifyRequest } from '../lib/slack-utils';
import type { WebhookChatMessage, WebhookNotification } from '../types';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  await verifyRequest({ request, rawBody });

  try {
    const botUser = await getBotUser();

    const event = {
      type: request.headers.get('X-Discourse-Event-Type'),
      id: request.headers.get('X-Discourse-Event-Id'),
    };

    if (
      event.type === 'notification' &&
      payload.notification?.notification_type === 29 &&
      payload.notification?.user_id === botUser.id
    ) {
      console.log('processing AI request from notification');
      waitUntil(
        handleNewAppMention(
          payload?.notification as WebhookNotification,
          botUser,
        ),
      );
    } else if (
      event.type === 'chat_message' &&
      payload?.chat_message.message.user.id !== botUser.id
    ) {
      waitUntil(
        handleNewAssistantMessage(
          payload?.chat_message as WebhookChatMessage,
          botUser,
        ),
      );
    }

    return new Response('Success!', { status: 200 });
  } catch (error) {
    console.error('Error generating response', error);
    return new Response('Error generating response', { status: 500 });
  }
}
