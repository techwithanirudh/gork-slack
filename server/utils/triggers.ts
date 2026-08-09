import type { SlackMessageContext } from '~/types';
import { getGroupMentions } from '~/utils/blocks';
import { getSlackUserName } from '~/utils/users';

export type TriggerType = 'ping' | 'keyword' | 'dm' | null;

function isPlainMessage(
  event: SlackMessageContext['event']
): event is SlackMessageContext['event'] & { text: string; user: string } {
  const subtype = 'subtype' in event ? event.subtype : undefined;
  return (
    (!subtype || subtype === 'thread_broadcast') &&
    typeof event.text === 'string' &&
    typeof event.user === 'string'
  );
}

export interface Trigger {
  info: string | string[] | null;
  type: TriggerType;
}

export async function getTrigger(
  message: SlackMessageContext,
  keywords: string[],
  botId?: string
): Promise<Trigger> {
  const { event, client } = message;

  if (!isPlainMessage(event)) {
    return { type: null, info: null };
  }

  const content = event.text.trim();

  if (botId && content.includes(`<@${botId}>`)) {
    const displayName = await getSlackUserName(client, botId);
    return { type: 'ping', info: displayName };
  }

  if (botId) {
    const groupIds = getGroupMentions(event.blocks);
    const matchedGroups: string[] = [];
    for (const groupId of groupIds) {
      try {
        const res = await client.usergroups.users.list({ usergroup: groupId });
        if ((res.users ?? []).includes(botId)) {
          matchedGroups.push(groupId);
        }
      } catch {
        // skip groups we can't check
      }
    }
    if (matchedGroups.length > 0) {
      return { type: 'ping', info: matchedGroups };
    }
  }

  const lowercase = content.toLowerCase();
  const matchedKeywords = keywords.filter((k) =>
    lowercase.includes(k.toLowerCase())
  );
  if (matchedKeywords.length > 0) {
    return { type: 'keyword', info: matchedKeywords };
  }

  if (event.channel_type === 'im') {
    return { type: 'dm', info: event.user };
  }

  return { type: null, info: null };
}
