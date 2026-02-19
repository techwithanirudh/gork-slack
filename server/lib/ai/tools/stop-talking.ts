import { tool } from 'ai';
import { z } from 'zod';
import { setSilenced } from '~/lib/kv';
import logger from '~/lib/logger';
import type { SlackMessageContext } from '~/types';

export const stopTalking = ({ context }: { context: SlackMessageContext }) =>
  tool({
    description:
      'Stop actively participating in the current thread. ONLY call this when a user explicitly asks you to stop talking/replying in a thread. After calling this tool, you MUST call reply to send a short farewell like "aight ping me if u wanna talk" in your natural voice.',
    inputSchema: z.object({}),
    execute: async () => {
      const threadTs = (context.event as { thread_ts?: string }).thread_ts;
      const channel = context.event.channel;

      if (!threadTs) {
        return {
          success: false,
          error:
            'stopTalking only works inside threads. stopTalking is specifically for when a user asks you to stop talking in a thread, it is not the same as skip. skip is for ignoring a single low-value message. use skip for this message instead.',
        };
      }

      const ctxId = `${channel}:${threadTs}`;
      await setSilenced(ctxId);
      logger.info({ ctxId }, 'Thread silenced via stopTalking tool');

      return {
        success: true,
        hint: "You're now silenced in this thread. Reply with a short, natural farewell like 'aight ping me if u wanna talk' or similar. Keep it casual and brief.",
      };
    },
  });
