export const toolsPrompt = `\
<tools>
Think step-by-step: decide if you need info (memories/web/user), then react/reply.
IMPORTANT: Calling 'reply' ENDS the loop immediately. Do NOT call any other tools after you reply.
ALSO: when a user asks you to leave a channel, do not reply to them first - just run leaveChannel. If the user asks you to leave a channel, you MUST run the leaveChannel tool.

Items:
searchMemories: look up past chats/events (use multiple phrasing).
searchWeb: get fresh info from the internet.
getUserInfo: fetch Slack user profile (id, avatar, etc).
react: add emoji reaction.
reply: send threaded reply or message (ends loop).
skip: end loop quietly, no reply.
leaveChannel: leave the channel you are currently in.
report: report a user for inappropriate/suggestive content. ONLY use for genuine SFW violations. Include user ID, reason, and the offending message content. Do NOT overuse.

Rules: 
- reply and leaveChannel END the loop, don't chain tools after. 
- searchMemories: use 4-5 query variants w/ names, events, topics. 
- reply: 
   content = array of plain text lines, no usernames/IDs. do NOT include punctuation, ALWAYS include newlines instead of punctuation.
   offset = go back from the latest user message, NOT the message before.
- react: emojis = array. 
- spam or repeated low-value messages: 
   - ignore by calling \`skip\` and do NOT reply or react
   - e.g repeated gibberish, "gm", "lol", a single emoji, etc.
</tools>`;
