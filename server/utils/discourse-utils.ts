import * as crypto from 'node:crypto';
import type { CoreMessage } from 'ai';
import { client } from '../../client/client.gen';
import {
  getThread as _getThread,
  editMessage,
  getMessages as _getMessages,
  getThreadMessages as _getThreadMessages,
  getSession,
  sendMessage,
} from '../../client/sdk.gen';
import type { GetSessionResponse } from '../../client/types.gen';
import type { WebhookChatMessage } from '../types';
import { env } from '~/env';
import type { EventHandlerRequest, H3Event } from 'h3'

const signingSecret = env.DISCOURSE_SIGNING_SECRET;
const url = env.DISCOURSE_URL;

client.setConfig({
  baseUrl: url,
  headers: {
    'Api-Key': env.DISCOURSE_BOT_TOKEN,
  },
});

// See https://api.slack.com/authentication/verifying-requests-from-slack
export function isValidDiscourseRequest({
  request,
  rawBody,
}: {
  request: H3Event<EventHandlerRequest>;
  rawBody: string;
}): boolean {
  const signatureHeader = getRequestHeader(request, 'X-Discourse-Event-Signature');

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    console.log('Missing or malformed signature');
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
    console.log('HMAC comparison failed:', err);
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

export const updateStatusUtil = async (
  initialStatus: string,
  event: WebhookChatMessage,
  thread_id?: number | null,
) => {
  const res = await sendMessage({
    path: {
      channel_id: event.channel?.id,
    },
    body: {
      message: initialStatus,
      thread_id: thread_id ?? undefined,
    },
  });

  if (!res?.data || !res.data?.message_id) {
    throw new Error(`Failed to post initial message, thread_id: ${thread_id}, ${JSON.stringify(res)}`);
  }

  const initialMessage = res.data;

  const updateMessage = async (status: string) => {
    await editMessage({
      path: {
        channel_id: event.channel?.id,
        message_id: initialMessage.message_id!,
      },
      body: {
        message: status,
      },
    });
  };
  return updateMessage;
};

export async function getMessages(
  channel_id: number,
  botUser: GetSessionResponse['current_user'],
): Promise<CoreMessage[]> {
  const res = await _getMessages({
    path: {
      channel_id,
    },
    query: {
      page_size: 50,
    },
  });

  if (!botUser) throw new Error('botUser is undefined');
  if (!res?.data?.messages) throw new Error('No messages found in thread');
  const { messages } = res.data;

  const result = messages
    .map((message) => {
      const isBot = message.user?.id === botUser.id;
      if (!message.message) return null;

      // For app mentions, remove the mention prefix
      // For DM messages, keep the full text
      let content = message.message;
      if (!isBot && content.includes(`<@${botUser.username}>`)) {
        content = content.replace(`<@${botUser.username}> `, '');
      }

      return {
        role: isBot ? 'assistant' : 'user',
        content: `${message.user?.name} (${message.user?.username}): ${content}`,
      } as CoreMessage;
    })
    .filter((msg): msg is CoreMessage => msg !== null);

  return result;
}

export async function getThreadMessages(
  channel_id: number,
  botUser: GetSessionResponse['current_user'],
  thread_id: number,
): Promise<CoreMessage[]> {
  const res = await _getThreadMessages({
    path: {
      channel_id,
      thread_id: thread_id,
    },
    query: {
      page_size: 50,
    },
  });

  if (!botUser) throw new Error('botUser is undefined');
  if (!res?.data?.messages) throw new Error('No messages found in thread');
  const { messages } = res.data;

  const result = messages
    .map((message) => {
      const isBot = message.user?.id === botUser.id;
      if (!message.message) return null;

      // For app mentions, remove the mention prefix
      // For DM messages, keep the full text
      let content = message.message;
      if (!isBot && content.includes(`<@${botUser.username}>`)) {
        content = content.replace(`<@${botUser.username}> `, '');
      }

      return {
        role: isBot ? 'assistant' : 'user',
        content: `${message.user?.username}: ${content}`,
      } as CoreMessage;
    })
    .filter((msg): msg is CoreMessage => msg !== null);

  return result;
}

export const getBotUser = async () => {
  // const { user_id: botUserId } = await client.auth.test();
  const res = await getSession();

  if (!res?.data?.current_user) {
    throw new Error('Session is undefined');
  }

  const { current_user: user } = res.data;

  if (!user) {
    throw new Error('botUser is undefined');
  }

  return user;
};
