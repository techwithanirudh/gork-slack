export const keywords = ['gork', 'grok'];
export const country = 'United States';
export const city = 'New York';
export const timezone = 'America/New_York';

export const speed = {
  minDelay: 5,
  maxDelay: 15,
  speedMethod: 'divide',
  speedFactor: 180 * 180,
};

export const messageThreshold = 20;

export const memories = {
  eachLimit: 2,
  maxMemories: 4,
};

export const moderation = {
  banThreshold: 15,
  contextMessages: 3,
  reports: {
    expiration: 7 * 24 * 60 * 60, // Expiration time in seconds (7 days)
  },
};
