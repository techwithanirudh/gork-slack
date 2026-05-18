#!/usr/bin/env bun

/**
 * One-shot script: explicitly set channel mode to 'relevance' for all channels
 * Gork is already in that have no stored channel mode. This grandfathers existing
 * channels so future changes to new-channel defaults don't affect them.
 */

import { WebClient } from '@slack/web-api';
import { RedisClient } from 'bun';
import chalk from 'chalk';
import { env } from '../server/env';

const slack = new WebClient(env.SLACK_BOT_TOKEN);
const redis = new RedisClient(env.REDIS_URL);

const channelModeKey = (channelId: string) => `ctx:mode:${channelId}`;

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (dryRun) {
    console.log(chalk.yellow('[dry run] no changes will be written'));
  }
  console.log(chalk.cyan('Fetching channels Gork is a member of...'));

  const channels: { id: string; name: string }[] = [];
  let cursor: string | undefined;

  do {
    const res = await slack.users.conversations({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 999,
      cursor,
    });

    for (const ch of res.channels ?? []) {
      if (ch.id && ch.name) {
        channels.push({ id: ch.id, name: ch.name });
      }
    }

    cursor = res.response_metadata?.next_cursor ?? undefined;
  } while (cursor);

  console.log(chalk.cyan(`Found ${channels.length} channels.`));

  let set = 0;
  let skipped = 0;

  for (const { id, name } of channels) {
    const existing = await redis.get(channelModeKey(id));
    if (existing) {
      console.log(
        chalk.dim(`  #${name}: already has mode "${existing}", skipping`)
      );
      skipped++;
      continue;
    }
    if (!dryRun) {
      await redis.set(channelModeKey(id), 'relevance');
    }
    console.log(
      chalk.green(`  #${name}: ${dryRun ? 'would set' : 'set'} to relevance`)
    );
    set++;
  }

  console.log(
    chalk.bold(
      `\n${dryRun ? '[dry run] ' : ''}Done. ${dryRun ? 'Would set' : 'Set'}: ${set}, Skipped (already had mode): ${skipped}`
    )
  );
}

await main();
