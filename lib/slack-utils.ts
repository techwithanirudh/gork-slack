import { WebClient } from '@slack/web-api';
import { CoreMessage } from 'ai'
import crypto from 'crypto'
import DiscourseAPI from 'discourse2-chat';

const signingSecret = process.env.DISCOURSE_SIGNING_SECRET!
const url = process.env.DISCOURSE_URL!;

export const client = new DiscourseAPI(url, {
  'Api-Key': process.env.DISCOURSE_BOT_TOKEN!
})

// See https://api.slack.com/authentication/verifying-requests-from-slack
export function isValidDiscourseRequest({
  request,
  rawBody,
}: {
  request: Request
  rawBody: string
}): boolean {
  const signatureHeader = request.headers.get('X-Discourse-Event-Signature')

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    console.log('Missing or malformed signature')
    return false
  }

  const receivedHmac = signatureHeader.slice(7) // remove "sha256="
  const computedHmac = crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, 'utf8'),
      Buffer.from(computedHmac, 'utf8')
    )
  } catch (err) {
    console.log('HMAC comparison failed:', err)
    return false
  }
}

export const verifyRequest = async ({
  requestType,
  request,
  rawBody,
}: {
  requestType: string;
  request: Request;
  rawBody: string;
}) => {
  const validRequest = await isValidDiscourseRequest({ request, rawBody });
  if (!validRequest || requestType !== "event_callback") {
    return new Response("Invalid request", { status: 400 });
  }
};

export const updateStatusUtil = (channel: string, thread_ts: string) => {
  return async (status: string) => {
    // await client.assistant.threads.setStatus({
    //   channel_id: channel,
    //   thread_ts: thread_ts,
    //   status: status,
    // });
  };
};

export async function getThread(
  channel_id: number,
  thread_ts: string,
  botUserId: string,
): Promise<CoreMessage[]> {
  const { messages } = await client.getMessages({
    channel_id,
    page_size: 50,
  });

  // Ensure we have messages

  if (!messages) throw new Error("No messages found in thread");

  const result = messages
    .map((message) => {
      const isBot = message.user?.username === botUserId;
      if (!message.message) return null;

      // For app mentions, remove the mention prefix
      // For IM messages, keep the full text
      let content = message.message;
      if (!isBot && content.includes(`<@${botUserId}>`)) {
        content = content.replace(`<@${botUserId}> `, "");
      }

      return {
        role: isBot ? "assistant" : "user",
        content: content,
      } as CoreMessage;
    })
    .filter((msg): msg is CoreMessage => msg !== null);

  return result;
}

export const getBotId = async () => {
  // const { user_id: botUserId } = await client.auth.test();
  const botUserId = 'gpt';

  if (!botUserId) {
    throw new Error("botUserId is undefined");
  }
  return botUserId;
};
