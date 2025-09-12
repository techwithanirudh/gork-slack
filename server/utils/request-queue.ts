interface QueueItem {
  id: string;
  task: () => Promise<any>;
  priority: number;
  timestamp: number;
}

class RequestQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private readonly MAX_CONCURRENT = 2;
  private activeCount = 0;

  async add<T>(task: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      
      this.queue.push({
        id,
        task: async () => {
          try {
            const result = await task();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        priority,
        timestamp: Date.now()
      });

      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.activeCount >= this.MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0 && this.activeCount < this.MAX_CONCURRENT) {
      const item = this.queue.shift();
      if (item) {
        this.activeCount++;
        item.task().finally(() => {
          this.activeCount--;
          this.process();
        });
      }
    }

    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }
}

export const requestQueue = new RequestQueue();