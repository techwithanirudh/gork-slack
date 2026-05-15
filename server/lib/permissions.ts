import { env } from '~/env';

export function isAdmin(userId: string): boolean {
  return new Set(env.ADMINS ?? []).has(userId);
}
