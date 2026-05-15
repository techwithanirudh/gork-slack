import { env } from '~/env';

const adminUserIds = new Set(env.ADMINS ?? []);

export function isAdmin(userId: string): boolean {
  return adminUserIds.has(userId);
}
