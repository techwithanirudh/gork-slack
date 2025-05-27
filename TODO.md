discourse-2 chat openapi is broken it doesn't have proper spec it thinks that in the   const initialMessage = await client.postMessage({
    channel_id: event.channel?.id,
    // thread_ts: event.thread_ts ?? event.ts,
    message: initialStatus,
  });

has a .message.id instead of a message_id 

https://github.com/nitrojs/nitro/discussions/1356
put something like bro instead of thinking and in final response add the bro at the beggign have words like that
have a matching list or smth like lol is rofl like that ok
or just use the typing indicator in discourse figure out
- make the starting message different randomzie like bro, lmao like that through keyword recognition, now it is fixed to bro, make it a setting
- add mem0 support for adding memories
- add ability for it to reply in posts
- add staggered reply tokenize msgs
- use the prompts.ts and add request hints
- do the relevance check
- set custom status like discord bto does like online offline and custom status msgg
- mark deleted messages as deleted so the ai know why it responded, same with edited messages
