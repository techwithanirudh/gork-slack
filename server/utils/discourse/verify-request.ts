import * as crypto from 'node:crypto';
import { type EventHandlerRequest, type H3Event, getRequestHeader } from 'h3';
import { env } from '~/env';
import logger from '~/lib/logger';

const signingSecret = env.DISCOURSE_SIGNING_SECRET;

export function isValidDiscourseRequest({
  request,
  rawBody,
}: {
  request: H3Event<EventHandlerRequest>;
  rawBody: string;
}): boolean {
  const signatureHeader = getRequestHeader(
    request,
    'X-Discourse-Event-Signature',
  );

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    logger.info('Missing or malformed signature');
    return false;
  }

  const receivedHmac = signatureHeader.slice(7); // remove "sha256="
  const computedHmac = crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, 'utf8'),
      Buffer.from(computedHmac, 'utf8'),
    );
  } catch (err) {
    logger.info('HMAC comparison failed:', err);
    return false;
  }
}

export const verifyRequest = async ({
  request,
  rawBody,
}: {
  request: H3Event<EventHandlerRequest>;
  rawBody: string;
}) => {
  const validRequest = await isValidDiscourseRequest({ request, rawBody });
  if (!validRequest) {
    return new Response('Invalid request', { status: 400 });
  }
};
