import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { ModelMessage } from 'ai';
import { memories as memoriesConfig } from '~/config';
import { queryMemories } from '~/lib/pinecone/operations';
import type { PineconeMetadataOutput, SlackMessageContext } from '~/types';
import { buildHistorySnippet } from '~/utils/messages';
import { getSlackUserName } from '~/utils/users';

export async function buildContextMemories({
  ctx,
  messages,
  text,
  userId,
}: {
  ctx: SlackMessageContext;
  messages: ModelMessage[];
  text: string;
  userId?: string;
}): Promise<ScoredPineconeRecord<PineconeMetadataOutput>[]> {
  const historySnippet = buildHistorySnippet({ messages, limit: 3 });
  const authorName = userId
    ? await getSlackUserName({ client: ctx.client, userId })
    : 'unknown';
  const currentMessage = `${authorName}: ${text}`;

  const [
    byText,
    byHistory,
    byHistoryRecent,
    byMessage,
    byMessageRecent,
    byHistoryTools,
    byHistoryToolsRecent,
  ] = await Promise.all([
    queryMemories(text, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
    }),
    queryMemories(historySnippet, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
    }),
    queryMemories(historySnippet, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
      ageLimit: memoriesConfig.recentAge,
    }),
    queryMemories(currentMessage, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
    }),
    queryMemories(currentMessage, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
      ageLimit: memoriesConfig.recentAge,
    }),
    queryMemories(historySnippet, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
      ignoreRecent: false,
      onlyTools: true,
    }),
    queryMemories(historySnippet, {
      namespace: 'default',
      limit: memoriesConfig.eachLimit,
      ignoreRecent: false,
      onlyTools: true,
      ageLimit: memoriesConfig.recentAge,
    }),
  ]);

  const memoryLists = [
    byHistoryToolsRecent,
    byHistory,
    byMessageRecent,
    byMessage,
    byHistoryTools,
    byText,
    byHistoryRecent,
  ];

  const combined: ScoredPineconeRecord<PineconeMetadataOutput>[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < memoriesConfig.eachLimit; i++) {
    for (const list of memoryLists) {
      const mem = list?.[i];
      if (!mem || combined.length >= memoriesConfig.maxMemories) {
        continue;
      }
      const id = mem.id ?? '';
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      combined.push(mem);
      if (combined.length === memoriesConfig.maxMemories) {
        break;
      }
    }
    if (combined.length === memoriesConfig.maxMemories) {
      break;
    }
  }

  return combined;
}
