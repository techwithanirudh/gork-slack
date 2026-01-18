#!/usr/bin/env bun

import { RedisClient } from 'bun';
import chalk from 'chalk';
import { env } from '../server/env';

const prompt = async (message: string): Promise<string> => {
  process.stdout.write(message);
  for await (const line of console) {
    return line.trim();
  }
  return '';
};

const redis = new RedisClient(env.REDIS_URL);

async function getReportData(userId: string) {
  const reportsKey = `user:reports:${userId}`;
  const bannedKey = `user:banned:${userId}`;

  const reportCount = await redis.zcard(reportsKey);
  const isBanned = (await redis.get(bannedKey)) === '1';
  const reports = await redis.zrange(reportsKey, 0, -1);

  return { reportCount, isBanned, reports };
}

async function displayReports(userId: string) {
  const { reportCount, isBanned, reports } = await getReportData(userId);

  console.log(`\n${chalk.bold('User:')} ${userId}`);
  console.log(`${chalk.bold('Reports:')} ${reportCount}`);
  console.log(
    `${chalk.bold('Banned:')} ${isBanned ? chalk.red('Yes') : chalk.green('No')}`
  );

  if (reportCount > 0) {
    console.log(`\n${chalk.bold('Report History:')}`);
    for (const report of reports) {
      const [timestamp, ...reasonParts] = report.split(':');
      const reason = reasonParts.join(':');
      const date = new Date(Number(timestamp));
      console.log(`  ${chalk.dim(date.toLocaleString())} - ${reason}`);
    }
  }

  return { reportCount, isBanned };
}

async function clearReports(userId: string) {
  const reportsKey = `user:reports:${userId}`;
  const bannedKey = `user:banned:${userId}`;

  const { reportCount, isBanned } = await getReportData(userId);

  if (reportCount > 0) {
    await redis.del(reportsKey);
    console.log(chalk.green(`\nCleared ${reportCount} reports`));
  }

  if (isBanned) {
    await redis.del(bannedKey);
    console.log(chalk.green('Removed ban status'));
  }

  if (reportCount > 0 || isBanned) {
    console.log(chalk.green(`\nAll reports cleared for ${userId}`));
  }
}

async function main() {
  let userId = process.argv[2];

  if (!userId) {
    userId = await prompt(chalk.cyan('User ID: '));
    if (!userId) {
      console.error(chalk.red('Error: User ID required'));
      process.exit(1);
    }
  }

  try {
    const { reportCount, isBanned } = await displayReports(userId);

    if (reportCount === 0 && !isBanned) {
      console.log(chalk.dim('\nNo reports found'));
      return;
    }

    console.log(`\n${chalk.bold('Options:')}`);
    console.log('  1. Exit');
    console.log('  2. Clear reports');

    const choice = await prompt(chalk.cyan('\nChoice (1-2): '));

    if (choice === '2') {
      const confirm = await prompt(chalk.yellow('Confirm clear (yes/no): '));
      if (confirm.toLowerCase() === 'yes') {
        await clearReports(userId);
      } else {
        console.log(chalk.dim('\nCancelled'));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

await main();
