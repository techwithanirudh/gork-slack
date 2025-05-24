import { getBotUser, verifyRequest } from '~/utils/discourse';
import {
  defineEventHandler,
  readRawBody,
  getRequestHeader,
  createError,
} from 'h3';
import logger from '~/lib/logger';
import { events } from '~/events';

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
    if (eventHandler) {
      request.waitUntil(
        eventHandler.execute(payload[eventHandler.name], botUser),
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
