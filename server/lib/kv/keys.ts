export const keys = {
  messageCount: (contextId: string) => `ctx:messageCount:${contextId}`,
  channelCount: (contextId: string) => `ctx:channelCount:${contextId}`,
  userReports: (userId: string) => `user:reports:${userId}`,
  userBanned: (userId: string) => `user:banned:${userId}`,
  silenced: (contextId: string) => `ctx:silenced:${contextId}`,
  channelMode: (channelId: string) => `ctx:mode:${channelId}`,
  workspaceMode: (workspaceId: string) => `ws:mode:${workspaceId}`,
  djSessions: () => 'dj:sessions',
  djPlayback: () => 'dj:playback',
  djAbandoned: (requestTs: string) => `dj:abandoned:${requestTs}`,
};
