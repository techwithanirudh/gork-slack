import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { WebClient } from '@slack/web-api';
import type { ModelMessage } from 'ai';
import { dj, memories as memoriesConfig } from '~/config';
import type { DjSession } from '~/lib/kv';
import { queryMemories } from '~/lib/pinecone/operations';
import { getConversationMessages } from '~/slack/conversations';
import type { PineconeMetadataOutput } from '~/types';
import { buildHistorySnippet } from '~/utils/messages';

let botUserId: string | undefined;

export async function getDjContext({
  client,
  session,
  queries,
}: {
  client: WebClient;
  session: DjSession;
  queries: (string | undefined)[];
}): Promise<{
  messages: ModelMessage[];
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[];
}> {
  botUserId ??= (await client.auth.test()).user_id;
  const messages = await getConversationMessages({
    client,
    channel: session.origin.channel,
    threadTs: session.origin.threadTs,
    botUserId,
    limit: dj.auto.contextMessages,
  });

  const results = await Promise.all(
    [...queries, buildHistorySnippet(messages, 5)].map((query) =>
      queryMemories(query ?? '', { limit: memoriesConfig.eachLimit })
    )
  );
  const seen = new Set<string>();
  const memories: ScoredPineconeRecord<PineconeMetadataOutput>[] = [];
  for (const memory of results.flat()) {
    if (memories.length < memoriesConfig.maxMemories && !seen.has(memory.id)) {
      seen.add(memory.id);
      memories.push(memory);
    }
  }

  return { messages, memories };
}
