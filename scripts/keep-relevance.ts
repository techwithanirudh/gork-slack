#!/usr/bin/env bun

/**
 * One-shot script: for large channels (>= threshold) with no stored mode, prompt
 * to set ping. Small channels are left alone — relevance is already the default.
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

interface Channel {
  id: string;
  name: string;
}

type ChannelMode = 'ping';

async function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  for await (const line of console) {
    return line.trim().toLowerCase();
  }
  return '';
}

async function fetchBotChannels(): Promise<Channel[]> {
  const channels: Channel[] = [];
  let cursor: string | undefined;

  do {
    const res = await slack.users.conversations({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 999,
      cursor,
    });

    for (const channel of res.channels ?? []) {
      if (channel.id && channel.name) {
        channels.push({ id: channel.id, name: channel.name });
      }
    }

    cursor = res.response_metadata?.next_cursor ?? undefined;
  } while (cursor);

  return channels;
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

async function askShouldPing(
  channel: Channel,
  members: number
): Promise<boolean> {
  const answer = await prompt(
    chalk.yellow(
      `  #${channel.name} has ${members}+ members. Set to ping only? [y/n] `
    )
  );
  return answer.startsWith('y');
}

async function writeChannelMode(
  channel: Channel,
  mode: ChannelMode,
  members: number
): Promise<void> {
  if (!dryRun) {
    await redis.set(channelModeKey(channel.id), mode);
  }

  const action = dryRun ? 'would set' : 'set';
  console.log(
    chalk.green(`  #${channel.name}: ${action} to ${mode} (${members} members)`)
  );
}

async function main() {
  if (dryRun) {
    console.log(chalk.yellow('[dry run] no changes will be written'));
  }
  console.log(chalk.cyan('Fetching channels Gork is a member of...'));

  const channels = await fetchBotChannels();

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
      console.log(
        chalk.dim(`  #${name}: small channel, leaving as relevance (default)`)
      );
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        chalk.yellow(
          `  #${name}: would prompt (${members}+ members, large channel)`
        )
      );
      continue;
    }

    const channel = { id, name };
    const shouldPing = await askShouldPing(channel, members);
    if (shouldPing) {
      await writeChannelMode(channel, 'ping', members);
      set++;
    } else {
      console.log(chalk.dim(`  #${name}: keeping relevance (default)`));
      skipped++;
    }
  }

  console.log(
    chalk.bold(
      `\n${dryRun ? '[dry run] ' : ''}Done. ${dryRun ? 'Would set' : 'Set'}: ${set}, Skipped (already had mode): ${skipped}`
    )
  );
}

await main();
