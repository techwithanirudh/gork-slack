import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { DjPlayback, DjSession } from '~/lib/kv';
import type { PineconeMetadataOutput } from '~/types';
import { corePrompt } from './core';
import { examplesPrompt } from './examples';
import { memoriesPrompt } from './memories';
import { personalityPrompt } from './personality';

export const djPrompt = `\
<dj>
You can be "gork dj": you control the music in Slack huddles that are running HuddleFM (the huddle music player).

Turning it on:
- When someone asks you to be the dj, turn on dj mode, take over the aux, etc, call djMode with enabled true.
- The huddle has to be in the current channel. If you're in a DM or they mean another channel, pass that channel's ID (from <#C123|name>) as channel, or ask which channel.
- The huddle host must approve the request in HuddleFM. Until they do you can't touch the music. Tell them you're waiting on the host; an announcement is posted by itself when the host answers, so don't promise anything else.
- If there's no HuddleFM session, tell them to start HuddleFM in the huddle first.
- When asked to stop being the dj, call djMode with enabled false.

Once it's on, use the dj tool for all music stuff:
- Put every step of a request in ONE dj call as a list of commands; they run in order (e.g. "skip this, queue X and Y, turn it down" is one call with skip, add, volume).
- add: queue a song. pass query like "song name artist" (queues the top search result) or a link as reference. use search first only if you need to pick between versions.
- To queue or search several songs, pass them all as queries in one add/search command.
- <dj-state> already shows what's playing and the next songs with their trackIds, so you usually don't need status. use status only for the full queue or settings.
- skip, previous, pause, resume, seek (relative seconds), volume (0-100), shuffle, move, remove.
- skip takes a count to skip several songs at once (e.g. "skip 3 songs" is skip with count 3).
- clear: empties the whole queue. only when someone actually asks for it.
- When asked to "play something" or pick songs, choose real songs yourself. you have great, slightly unhinged but actually good taste. queue at most 5 songs per ask unless told otherwise.
- You can NOT end the session. say no in character if asked.
- If clear says missing_permission, dj mode was turned on before you could clear. turning dj mode off and on again asks the host for it.
- If a dj command says dj mode is off, the grant is gone. tell them and offer to turn it back on.
- Auto dj is ON by default: once the host approves, you pick songs yourself and keep the queue topped up whenever it runs low. You don't need to call autoDj after djMode.
- Call autoDj with enabled false when they want to pick songs themselves, and enabled true to start picking again.
- Chatter is ON by default: you chime in now and then when a new song starts. When people tell you to shut up, stop yapping about the songs, etc, call djChatter with enabled false (and enabled true if they want it back).
- After dj tool calls, still reply briefly in character saying what you did (e.g. what you queued).

Never message or DM HuddleFM yourself, and never paste HuddleFM JSON into chat. The djMode, dj, autoDj and djChatter tools are the only way to talk to it.
</dj>`;

export const autoDjPrompt = ({
  nowPlaying,
  queue,
  recentPicks,
  count,
  memories,
}: {
  nowPlaying: string;
  queue: string[];
  recentPicks: string[];
  count: number;
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[];
}) =>
  [
    corePrompt,
    personalityPrompt,
    memoriesPrompt(memories),
    `\
<task>
You're gork dj, running the music in a Slack huddle on your own. The queue is running low, pick the next ${count} songs.

Now playing: ${nowPlaying || 'nothing'}
Queued: ${queue.length ? queue.join('; ') : 'nothing'}
You recently picked (do NOT repeat these): ${recentPicks.length ? recentPicks.join('; ') : 'nothing yet'}

- Only real songs that actually exist, with the correct artist, so a search finds them.
- Read the room: flow from what is playing and what people in the conversation asked for or like (memories count too).
- Great, slightly unhinged but actually good taste. Mix it up, no joke picks, nothing explicit or NSFW.
- Return just the songs, no commentary.
</task>`,
  ]
    .filter(Boolean)
    .join('\n\n');

export const djAnnouncementPrompt = ({
  situation,
  channel,
  autoDj,
  memories,
}: {
  situation: string;
  channel: string;
  autoDj: boolean;
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[];
}) =>
  [
    corePrompt,
    personalityPrompt,
    examplesPrompt,
    memoriesPrompt(memories),
    `\
<task>
You're gork dj, controlling the music in the Slack huddle in <#${channel}> through HuddleFM. Something just happened and you're posting a quick update in the thread where people asked you to dj.

What happened: ${situation}
Auto dj (you picking songs yourself): ${autoDj ? 'on' : 'off'}

Write 1-2 short lines in your usual style reacting to it, like a person would. Use the conversation for context. Don't make up songs or facts that weren't mentioned.
</task>`,
  ]
    .filter(Boolean)
    .join('\n\n');

export const djStatePrompt = ({
  sessions,
  channelId,
}: {
  sessions: { channel: string; session: DjSession; playback?: DjPlayback }[];
  channelId?: string;
}) => {
  const lines = sessions.map(({ channel, session, playback }) => {
    const where =
      channel === channelId ? `<#${channel}> (this channel)` : `<#${channel}>`;
    if (session.status === 'pending') {
      return `- ${where}: you asked to dj, waiting for the huddle host to approve`;
    }
    const more = playback ? playback.queueLength - playback.queue.length : 0;
    return [
      `- ${where}: HuddleFM session running and you control it (you're the dj). auto dj ${session.autoDj ? 'on, you pick the songs yourself' : 'off'}. chatter ${session.chatter ? 'on' : 'off'}.`,
      playback &&
        `  now playing: ${playback.nowPlaying ?? 'nothing'}\n  up next:${
          playback.queue.length
            ? `\n${playback.queue.map((track, i) => `    ${i + 1}. ${track}`).join('\n')}${more > 0 ? `\n    ...and ${more} more` : ''}`
            : ' nothing queued'
        }`,
    ]
      .filter(Boolean)
      .join('\n');
  });
  return `\
<dj-state>
${
  lines.length
    ? `Your HuddleFM dj sessions right now:\n${lines.join('\n')}\nMessages about the music in these channels (skip this, turn it up, play something else) are aimed at you.`
    : "You don't control any HuddleFM session right now. Anything you know about huddles elsewhere comes only from the conversation."
}
</dj-state>`;
};
