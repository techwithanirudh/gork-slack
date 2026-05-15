export const redisKeys = {
  messageCount: (contextId: string) => `ctx:messageCount:${contextId}`,
  channelCount: (contextId: string) => `ctx:channelCount:${contextId}`,
  userReports: (userId: string) => `user:reports:${userId}`,
  userBanned: (userId: string) => `user:banned:${userId}`,
};
