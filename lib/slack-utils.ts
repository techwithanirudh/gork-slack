import type { WebhookChatMessage, WebhookNotification } from '../types';
import type { CoreMessage } from 'ai'
import * as crypto from 'node:crypto'
import { client } from '../client/client.gen';
import { postMessage, editMessage, getMessages, getSession } from '../client/sdk.gen';

const signingSecret = process.env.DISCOURSE_SIGNING_SECRET!
const url = process.env.DISCOURSE_URL!;

client.setConfig({
  baseUrl: url,
  headers: {
    'Api-Key': process.env.DISCOURSE_BOT_TOKEN!,
  }
});

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
  const res = await postMessage({
    path: {
      channel_id: event.channel?.id,
    },
    // thread_ts: event.thread_ts ?? event.ts,
    body: {
      message: initialStatus,
    }
  });

  if (!res?.data) throw new Error("Failed to post initial message");
  const initialMessage = res.data;

  // @ts-expect-error the types for this are broken
  if (!initialMessage || !initialMessage.message_id)
    throw new Error("Failed to post initial message");

  const updateMessage = async (status: string) => {
    await editMessage({
      path: {
        channel_id: event.channel?.id,
        // @ts-expect-error the types for this are broken
        message_id: initialMessage.message_id!,
      },
      body: {
        message: status,
      },
    });
  };
  return updateMessage;
};

export async function getThread(
  channel_id: number,
  // thread_ts: string,
  botUserId: number,
): Promise<CoreMessage[]> {
  const res = await getMessages({
    path: {
      channel_id,
    },
    query: {
      page_size: 50,
    }
  });

  if (!res?.data?.messages) throw new Error("No messages found in thread");
  const { messages } = res.data;

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
  const res = await getSession();

  if (!res?.data?.current_user) {
    throw new Error("Session is undefined");
  }

  const { current_user: user } = res.data;
  const id = user?.id;

  if (!id) {
    throw new Error("botUserId is undefined");
  }

  return id;
};
