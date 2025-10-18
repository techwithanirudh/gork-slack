import type { WebClient } from '@slack/web-api';
import { speed as speedConfig } from '~/config';
import logger from '~/lib/logger';
import { normalize, sentences } from './tokenize-messages';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateDelay(text: string): number {
  const { speedMethod, speedFactor } = speedConfig;

  const length = text.length;
  const baseSeconds = (() => {
    switch (speedMethod) {
      case 'multiply':
        return length * speedFactor;
      case 'add':
        return length + speedFactor;
      case 'divide':
        return length / speedFactor;
      case 'subtract':
        return length - speedFactor;
      default:
        return length;
    }
  })();

  const punctuationCount = text
    .split(' ')
    .filter((w) => /[.!?]$/.test(w)).length;
  const extraMs = punctuationCount * 500;

  const totalMs = baseSeconds * 1000 + extraMs;
  return Math.max(totalMs, 100);
}

interface ReplyOptions {
  client: WebClient;
  channel: string;
  text: string;
  threadTs?: string;
}

export async function reply({
  client,
  channel,
  text,
  threadTs,
}: ReplyOptions): Promise<void> {
  const segments = normalize(sentences(text));
  let isFirst = true;

  for (const raw of segments) {
    const chunk = raw.trim();
    if (!chunk) continue;

    const { minDelay, maxDelay } = speedConfig;
    const pauseMs = (Math.random() * (maxDelay - minDelay) + minDelay) * 1000;
    await sleep(pauseMs);

    try {
      await sleep(calculateDelay(chunk));
      if (isFirst) {
        isFirst = false;
      }

      await client.chat.postMessage({
        channel,
        text: chunk,
        thread_ts: threadTs,
      });
    } catch (error) {
      logger.error({ error }, 'Error sending message');
      break;
    }
  }
}
