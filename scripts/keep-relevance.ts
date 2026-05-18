#!/usr/bin/env bun

/**
 * One-shot script: explicitly set channel mode for all channels Gork is already
 * in that have no stored channel mode. This grandfathers existing channels so
 * future changes to new-channel defaults don't affect them.
 *
 * Channels under the large-channel threshold default to relevance automatically.
 * Channels at or above the threshold prompt for relevance or ping.
 */

import { WebClient } from '@slack/web-api';
import { RedisClient } from 'bun';
import chalk from 'chalk';
import { channelMode as channelModeConfig } from '../server/config';
import { env } from '../server/env';

const slack = new WebClient(env.SLACK_BOT_TOKEN);
const redis = new RedisClient(env.REDIS_URL);

const channelModeKey = (channelId: string) => `ctx:mode:${channelId}`;
const dryRun = process.argv.includes('--dry-run');

async function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  for await (const line of console) {
    return line.trim().toLowerCase();
  }
  return '';
}

async function getMemberCount(channelId: string): Promise<number> {
  const { largeChannelThreshold } = channelModeConfig;
  let count = 0;
  let cursor: string | undefined;
  do {
    const res = await slack.conversations.members({
      channel: channelId,
      limit: largeChannelThreshold,
      cursor,
    });
    count += res.members?.length ?? 0;
    cursor =
      count < largeChannelThreshold
        ? (res.response_metadata?.next_cursor ?? undefined)
        : undefined;
  } while (cursor);
  return count;
}

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

  console.log(chalk.cyan(`Found ${channels.length} channels.\n`));

  let set = 0;
  let skipped = 0;
  const { largeChannelThreshold } = channelModeConfig;

  for (const { id, name } of channels) {
    const existing = await redis.get(channelModeKey(id));
    if (existing) {
      console.log(
        chalk.dim(`  #${name}: already has mode "${existing}", skipping`)
      );
      skipped++;
      continue;
    }

    const members = await getMemberCount(id);
    const isLarge = members >= largeChannelThreshold;

    if (!isLarge) {
      if (!dryRun) {
        await redis.set(channelModeKey(id), 'relevance');
      }
      console.log(
        chalk.green(
          `  #${name}: ${dryRun ? 'would set' : 'set'} to relevance (${members} members)`
        )
      );
      set++;
      continue;
    }

    if (dryRun) {
      console.log(
        chalk.yellow(
          `  #${name}: would prompt (${members}+ members, large channel)`
        )
      );
      set++;
      continue;
    }

    const answer = await prompt(
      chalk.yellow(
        `  #${name} has ${members}+ members. Set to [r]elevance or [p]ing? `
      )
    );
    const mode = answer.startsWith('p') ? 'ping' : 'relevance';
    await redis.set(channelModeKey(id), mode);
    console.log(chalk.green(`  #${name}: set to ${mode}`));
    set++;
  }

  console.log(
    chalk.bold(
      `\n${dryRun ? '[dry run] ' : ''}Done. ${dryRun ? 'Would set' : 'Set'}: ${set}, Skipped (already had mode): ${skipped}`
    )
  );
}

await main();
