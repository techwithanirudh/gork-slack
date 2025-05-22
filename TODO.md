discourse-2 chat openapi is broken it doesn't have proper spec it thinks that in the   const initialMessage = await client.postMessage({
    channel_id: event.channel?.id,
    // thread_ts: event.thread_ts ?? event.ts,
    message: initialStatus,
  });

has a .message.id instead of a message_id 