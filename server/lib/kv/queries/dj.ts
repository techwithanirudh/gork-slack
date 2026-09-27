import { redis } from '../client';
import { keys } from '../keys';

export interface DjSession {
  // Where the DJ request was made, so grant updates can be announced there.
  origin: { channel: string; threadTs?: string };
  requestedBy?: string;
  requestTs: string;
  status: 'pending' | 'active';
}

export async function getDjSession(channel: string): Promise<DjSession | null> {
  const raw = await redis.hget(keys.djSessions(), channel);
  return raw ? (JSON.parse(raw) as DjSession) : null;
}

export async function setDjSession({
  channel,
  session,
}: {
  channel: string;
  session: DjSession;
}): Promise<void> {
  await redis.hset(keys.djSessions(), { [channel]: JSON.stringify(session) });
}

export async function clearDjSession(channel: string): Promise<void> {
  await redis.hdel(keys.djSessions(), channel);
}

export async function listDjSessions(): Promise<
  { channel: string; session: DjSession }[]
> {
  const all = await redis.hgetall(keys.djSessions());
  return Object.entries(all).map(([channel, raw]) => ({
    channel,
    session: JSON.parse(raw) as DjSession,
  }));
}

export async function findDjSessionByRequest(
  requestTs: string
): Promise<{ channel: string; session: DjSession } | null> {
  const sessions = await listDjSessions();
  return (
    sessions.find(({ session }) => session.requestTs === requestTs) ?? null
  );
}
