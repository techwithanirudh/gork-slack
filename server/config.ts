export const keywords = ['gork', 'grok'];

// Used when the model needs a default location/time context.
export const locale = {
  country: 'United States',
  city: 'New York',
  timezone: 'America/New_York',
};

// RAG context limits. recentAge is milliseconds and prevents echoing fresh chats.
export const memories = {
  eachLimit: 2,
  maxMemories: 4,
  recentAge: 1000 * 60 * 60,
};

export const loadingMessages = [
  'cooking...',
  'thinking rn...',
  'give me a sec...',
  'on it...',
];

export const rateLimit = {
  // Hard cap for all replies in a channel/thread context, regardless of trigger.
  channel: {
    windowSeconds: 30,
    windowLimit: 56,
  },
  // Caps passive relevance replies after enough ignored messages in a context.
  quota: {
    threshold: 25,
    // Seconds before ignored-message quota resets.
    ttl: 60 * 60,
  },
  // !stop mutes a thread until someone pings Gork again or this expires.
  silence: {
    // Seconds before a thread mute expires on its own.
    ttl: 60 * 60 * 24 * 7,
  },
};

export const channelMode = {
  // Large channels default to ping-only when Gork is invited.
  largeChannelThreshold: 200,
};

export const moderation = {
  banThreshold: 15,
  // Number of recent messages attached to automated report context.
  contextMessages: 3,
  reports: {
    // Seconds before strikes stop counting toward automatic bans.
    expiration: 7 * 24 * 60 * 60,
  },
};

// Channels where destructive/admin-like commands should not run without admin.
export const restrictedChannels = [
  { id: 'C09P6S7H725', name: 'gork' },
  { id: 'C09PNAM0M0Q', name: 'gork-spam' },
  { id: 'C0AEV1PCX1V', name: 'gork-logs' },
  { id: 'C0A9ATPB2KF', name: 'gork-reports' },
];

// Channels where Gork should not respond at all.
export const blockedChannels = [
  { id: 'CNMU9L92Q', name: 'confessions' },
  { id: 'C0188CY57PZ', name: 'meta' },
  { id: 'C0C78SG9L', name: 'hq' },
  { id: 'C0AUZ1LAMH6', name: 'macondo' },
  { id: 'C0AU8AWD5BN', name: 'macondo-help' },
  { id: 'C0AUZ1P2DEC', name: 'macondo-bulletin' },
];
