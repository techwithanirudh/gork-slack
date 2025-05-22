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
  request,
  rawBody,
}: {
  request: Request;
  rawBody: string;
}) => {
  const validRequest = await isValidDiscourseRequest({ request, rawBody });
  if (!validRequest) {
    return new Response("Invalid request", { status: 400 });
  }
};

export const updateStatusUtil = (channel: number) => {
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
  // thread_ts: string,
  botUserId: number,
): Promise<CoreMessage[]> {
  const { messages } = await client.getMessages({
    channel_id,
    page_size: 50,
  });

  // Ensure we have messages

  if (!messages) throw new Error("No messages found in thread");

  const result = messages
    .map((message) => {
      console.log(message.user)
      // todo: use id
      const isBot = message.user?.username === botUserId as any;
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

export const getBotId = async (): Promise<number> => {
  // const { user_id: botUserId } = await client.auth.test();
  const session = await client.getSession();
  const id = session?.current_user?.id;

  if (!id) {
    throw new Error("botUserId is undefined");
  }
  
  return id;
};
