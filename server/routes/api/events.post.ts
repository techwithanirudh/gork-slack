import { waitUntil } from '@/utils/nitro';
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  readRawBody,
} from 'h3';
import { events } from '~/events';
import { getBotUser, verifyRequest } from '~/utils/discourse';

export default defineEventHandler(async (request) => {
  const rawBody = (await readRawBody(request)) ?? '{}';
  const payload = JSON.parse(rawBody);

  await verifyRequest({ request, rawBody });
  try {
    const botUser = await getBotUser();

    const event = {
      type: getRequestHeader(request, 'X-Discourse-Event-Type'),
      id: getRequestHeader(request, 'X-Discourse-Event-Id'),
    };

    const eventHandler = Object.values(events).find(
      (handler) => handler.name === event.type,
    );

    // if one event is triggered, we don't need to check the others
    if (eventHandler) {
      waitUntil(
        request,
        eventHandler.execute(payload[eventHandler.name], botUser)
      );
    }

    return 'Success!';
  } catch (error) {
    console.error('Error generating response', error);
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: 'Error generating response',
    });
  }
});
