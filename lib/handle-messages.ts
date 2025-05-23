import type { GetSessionResponse } from '../client/types.gen';
import { keywords } from '../config';
import type { WebhookChatMessage } from '../types';
import { generateResponse } from './generate-response';
import { getMessages, getThreadMessages, updateStatusUtil } from './slack-utils';

// export async function assistantThreadMessage(
//   event: AssistantThreadStartedEvent,
// ) {
//   const { channel_id, thread_ts } = event.assistant_thread;
//   console.log(`Thread started: ${channel_id} ${thread_ts}`);
//   console.log(JSON.stringify(event));

//   await sendMessage({
//     path: {
//       channel_id: channel_id,
//     },
//     // thread_ts: thread_ts,
//     body: {
//       message: "Hello, I'm an AI assistant built with the AI SDK by Vercel!",
//       // thread_id: thread_ts,
//     },
//   });

//   // await client.assistant.threads.setSuggestedPrompts({
//   //   channel_id: channel_id,
//   //   thread_ts: thread_ts,
//   //   prompts: [
//   //     {
//   //       title: "Get the weather",
//   //       message: "What is the current weather in London?",
//   //     },
//   //     {
//   //       title: "Get the news",
//   //       message: "What is the latest Premier League news from the BBC?",
//   //     },
//   //   ],
//   // });
// }

export async function handleNewAssistantMessage(
  event: WebhookChatMessage,
  botUser: GetSessionResponse['current_user'],
) {
  if (!botUser || event.message.user.id === botUser.id) return;

  const { channel } = event;
  const { message: content } = event.message;
  const thread_id = event.message.thread_id ?? null;

  const isDirectMessage = channel.chatable_type === 'DirectMessage';
  const hasKeyword = keywords.some((k) =>
    content.toLowerCase().includes(k.toLowerCase()),
  );

  if (!isDirectMessage && !hasKeyword) return;

  console.log('processing AI request from chat message');

  const updateStatus = await updateStatusUtil(
    'is thinking...',
    event,
    thread_id,
  );

  const messages = thread_id
    ? await getThreadMessages(channel.id as number, botUser, thread_id)
    : await getMessages(channel.id as number, botUser);
  const result = await generateResponse(messages, updateStatus);
  await updateStatus(result);
}
