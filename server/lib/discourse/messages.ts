import type { CoreMessage } from 'ai';
import {
  getMessages as _getMessages,
  getThreadMessages as _getThreadMessages,
} from '~~/client/sdk.gen';
import type { GetSessionResponse } from '~~/client/types.gen';
import { client } from './client';

export async function getMessages(
  channel_id: number,
  botUser: GetSessionResponse['current_user'],
): Promise<CoreMessage[]> {
  const res = await _getMessages({
    client,
    path: {
      channel_id,
    },
    query: {
      page_size: 25,
    },
  });

  if (!botUser) throw new Error('botUser is undefined');
  if (!res?.data?.messages) throw new Error('No messages found in thread');
  const { messages } = res.data;

  const result = messages
    .map((message) => {
      const { user } = message;
      const isBot = user?.id === botUser.id;
      if (!message.message) return null;

      // For app mentions, remove the mention prefix
      // For DM messages, keep the full text
      let content = message.message;
      if (!isBot && content.includes(`<@${botUser.username}>`)) {
        content = content.replace(`<@${botUser.username}> `, '');
      }

      const segments = [
        `${user?.username} (${user?.name}) (id:${user?.id}): `,
        content,
        // message.edited ? '(Edited)' : null,
        // message.deleted_by_id ? `(Deleted by ${message.deleted_by_id})` : null,
      ];

      if (message.edited) segments.push('::: system (Edited) :::');
      if (message.deleted_by_id) segments.push(`::: system (Deleted by ${message.deleted_by_id}) :::`);

      return {
        role: isBot ? 'assistant' : 'user',
        content: segments.filter(Boolean).join(' '),
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
    client,
    path: {
      channel_id,
      thread_id: thread_id,
    },
    query: {
      page_size: 25,
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
