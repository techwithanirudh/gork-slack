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

export const messageThreshold = 25;

export const memories = {
  eachLimit: 2,
  maxMemories: 4,
};

export const leaveChannelBlocklist = [
  { id: 'C09P6S7H725', name: 'gork' },
  { id: 'C0AEV1PCX1V', name: 'gork-logs' },
  { id: 'C0A9ATPB2KF', name: 'gork-reports' },
];

export const moderation = {
  banThreshold: 15,
  contextMessages: 3,
  reports: {
    expiration: 7 * 24 * 60 * 60, // Expiration time in seconds (7 days)
  },
};
