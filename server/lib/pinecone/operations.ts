import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import { getOptedOutUsers } from '~/lib/kv';
import logger from '~/lib/logger';
import { redactMemoryContext } from '~/lib/opt-out';
import type { PineconeMetadataOutput } from '~/types';
import { getIndex } from './index';
import { searchMemories } from './queries';

export interface QueryMemoriesOptions {
  ageLimit?: number;
  ignoreRecent?: boolean;
  limit?: number;
  namespace?: string;
  onlyTools?: boolean;
}

export const queryMemories = async (
  query: string,
  {
    namespace = 'default',
    limit = 4,
    ageLimit,
    ignoreRecent = true,
    onlyTools = false,
  }: QueryMemoriesOptions = {}
): Promise<ScoredPineconeRecord<PineconeMetadataOutput>[]> => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const now = Date.now();
  const filter: Record<string, unknown> = {};

  if (ignoreRecent) {
    filter.createdAt = { $lt: now - 60_000 };
  }

  if (ageLimit != null) {
    filter.createdAt = {
      ...(filter.createdAt || {}),
      $gt: now - ageLimit,
    };
  }

  if (onlyTools) {
    filter.type = { $eq: 'tool' };
  }

  try {
    const [matches, optedOut] = await Promise.all([
      searchMemories(query, {
        namespace,
        topK: limit,
        filter: Object.keys(filter).length ? filter : undefined,
      }),
      getOptedOutUsers(),
    ]);
    // Memories saved before someone opted out still hold their messages, so
    // they are hidden here on the way out instead of deleted.
    const results = matches.flatMap((match) => {
      if (match.metadata?.type !== 'chat') {
        return [match];
      }
      const context = redactMemoryContext(match.metadata.context, optedOut);
      return context === null
        ? []
        : [{ ...match, metadata: { ...match.metadata, context } }];
    });

    const index = (await getIndex()).namespace(namespace);
    Promise.all(
      results.map(({ id }: { id: string }) =>
        index.update({ id, metadata: { lastRetrievalTime: Date.now() } })
      )
    ).catch(() => undefined);

    return results;
  } catch (error) {
    logger.error({ error, query }, 'Error querying long term memory');
    return [];
  }
};
