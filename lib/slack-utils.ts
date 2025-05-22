import { WebhookChatMessage, WebhookNotification } from '@/types';
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

export const updateStatusUtil = async (
  initialStatus: string,
  event: WebhookChatMessage,
) => {
  const initialMessage = await client.postMessage({
    channel_id: event.channel?.id,
    // thread_ts: event.thread_ts ?? event.ts,
    message: initialStatus,
  });

  if (!initialMessage || !initialMessage.message_id)
    throw new Error("Failed to post initial message");

  const updateMessage = async (status: string) => {
    await client.editMessage({
      channel_id: event.channel?.id,
      message_id: initialMessage.message_id!,
      message: status,
    });
  };
  return updateMessage;
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
      // @ts-expect-error the types for this are broken
      const isBot = message.user?.id === botUserId as any;
      if (!message.message) return null;

      // For app mentions, remove the mention prefix
      // For DM messages, keep the full text
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
