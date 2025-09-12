interface BatchRequest {
  channel_id: number;
  thread_id?: number | null;
  messages: string[];
  resolve: (value: void) => void;
  reject: (error: Error) => void;
}

class MessageBatcher {
  private batches = new Map<string, BatchRequest[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private readonly BATCH_DELAY = 100;
  private readonly MAX_BATCH_SIZE = 3;

  async addToBatch(
    channel_id: number,
    thread_id: number | null | undefined,
    message: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = `${channel_id}:${thread_id || 'main'}`;
      
      if (!this.batches.has(key)) {
        this.batches.set(key, []);
      }

      const batch = this.batches.get(key)!;
      batch.push({
        channel_id,
        thread_id,
        messages: [message],
        resolve,
        reject
      });

      if (batch.length >= this.MAX_BATCH_SIZE) {
        this.processBatch(key);
      } else {
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key)!);
        }
        this.timers.set(key, setTimeout(() => this.processBatch(key), this.BATCH_DELAY));
      }
    });
  }

  private async processBatch(key: string): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch || batch.length === 0) return;

    this.batches.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    try {
      const { sendMessage } = await import('~~/client');
      const { client } = await import('~/lib/discourse/client');
      
      const combinedMessage = batch
        .flatMap(req => req.messages)
        .join(' ');

      await sendMessage({
        client,
        path: {
          channel_id: batch[0].channel_id,
        },
        body: {
          message: combinedMessage,
          thread_id: batch[0].thread_id ?? undefined,
        },
      });

      batch.forEach(req => req.resolve());
    } catch (error) {
      batch.forEach(req => req.reject(error as Error));
    }
  }
}

export const messageBatcher = new MessageBatcher();