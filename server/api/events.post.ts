import { waitUntil } from '@vercel/functions';
import { handleNewAppMention } from '../lib/handle-app-mention';
import { handleNewAssistantMessage } from '../lib/handle-messages';
import { getBotUser, verifyRequest } from '../lib/slack-utils';
import type { WebhookChatMessage, WebhookNotification } from '../types';

export default defineEventHandler(async event => {
  const rawBody = JSON.stringify(await readBody(event));
  const payload = JSON.parse(rawBody);

  await verifyRequest({ request: event, rawBody });

  try {
    const botUser = await getBotUser();

    const whEvent = {
      type: getRequestHeader(event, 'X-Discourse-Event-Type'),
      id: getRequestHeader(event, 'X-Discourse-Event-Id'),
    };

    if (
      whEvent.type === 'notification' &&
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
      whEvent.type === 'chat_message' &&
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
});
