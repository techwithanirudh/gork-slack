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

export const restrictedChannels = [
  { id: 'C09P6S7H725', name: 'gork' },
  { id: 'C09PNAM0M0Q', name: 'gork-spam' },
  { id: 'C0AEV1PCX1V', name: 'gork-logs' },
  { id: 'C0A9ATPB2KF', name: 'gork-reports' },
];

export const blockedChannels = [
  { id: 'CNMU9L92Q', name: 'confessions' },
  { id: 'C0188CY57PZ', name: 'meta' },
  { id: 'C0C78SG9L', name: 'hq' },
  { id: 'C0AUZ1LAMH6', name: 'macondo' },
  { id: 'C0AU8AWD5BN', name: 'macondo-help' },
  { id: 'C0AUZ1P2DEC', name: 'macondo-bulletin' },
];

export const channelMode = {
  largeChannelThreshold: 200,
};

export const moderation = {
  banThreshold: 15,
  contextMessages: 3,
  reports: {
    expiration: 7 * 24 * 60 * 60, // Expiration time in seconds (7 days)
  },
};
