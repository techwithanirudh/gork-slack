import { waitUntil } from '@vercel/functions';
import { handleNewAppMention } from '~/utils/handle-app-mention';
import { handleNewAssistantMessage } from '~/utils/handle-messages';
import { getBotUser, verifyRequest } from '~/utils/discourse';
import type { WebhookChatMessage, WebhookNotification } from '~/types';
import { defineEventHandler } from 'h3';
import { getRequestHeader, readBody } from 'h3';
import logger from "~/lib/logger";

export default defineEventHandler(async request => {
  const rawBody = JSON.stringify(await readBody(request));
  const payload = JSON.parse(rawBody);

  await verifyRequest({ request, rawBody });

  try {
    const botUser = await getBotUser();

    const event = {
      type: getRequestHeader(request, 'X-Discourse-Event-Type'),
      id: getRequestHeader(request, 'X-Discourse-Event-Id'),
    };

    if (
      event.type === 'notification' &&
      payload.notification?.notification_type === 29 &&
      payload.notification?.user_id === botUser.id
    ) {
      logger.info('processing AI request from notification');
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
});
