import { speed as speedConfig } from "~/config";
import { sentences, normalize } from "./tokenize-messages";
import logger from "~/lib/logger";
import { sendMessage } from "~~/client";
import { client } from '~/lib/discourse/client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateDelay(text: string): number {
    const { speedMethod, speedFactor } = speedConfig;

    const length = text.length;
    const baseSeconds = (() => {
        switch (speedMethod) {
            case "multiply":
                return length * speedFactor;
            case "add":
                return length + speedFactor;
            case "divide":
                return length / speedFactor;
            case "subtract":
                return length - speedFactor;
            default:
                return length;
        }
    })();

    const punctuationCount = text
        .split(" ")
        .filter((w) => /[.!?]$/.test(w)).length;
    const extraMs = punctuationCount * 500;

    const totalMs = baseSeconds * 1000 + extraMs;
    return Math.max(totalMs, 100);
}

export async function reply(reply: string, channel_id: number, thread_id?: number|null): Promise<void> {
    const segments = normalize(sentences(reply));
    let isFirst = true;

    for (const raw of segments) {
        const text = raw.toLowerCase().trim().replace(/\.$/, "");
        if (!text) continue;

        const { minDelay, maxDelay } = speedConfig;
        const pauseMs = (Math.random() * (maxDelay - minDelay) + minDelay) * 1000;
        await sleep(pauseMs);

        try {
            await sleep(calculateDelay(text));

            if (isFirst && Math.random() < 0.5) {
                await sendMessage({
                    client,
                    path: {
                        channel_id: channel_id,
                        // in_reply_to_id: reply ?? undefined,
                    },
                    body: {
                        message: text,
                        thread_id: thread_id ?? undefined,
                    },
                });
                isFirst = false;
            } else {
                await sendMessage({
                    client,
                    path: {
                        channel_id: channel_id,
                    },
                    body: {
                        message: text,
                        thread_id: thread_id ?? undefined,
                    },
                });
            }
        } catch (error) {
            logger.error({ error }, "Error sending message");
            break;
        }
    }
}