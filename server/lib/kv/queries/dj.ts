import { dj } from '~/config';
import { redis } from '../client';
import { keys } from '../keys';

export interface DjSession {
  autoDj?: { picks: string[] };
  origin: { channel: string; threadTs?: string };
  requestedBy?: string;
  requestTs: string;
  status: 'pending' | 'active';
  updatedAt: number;
}

function parseDjSession({
  channel,
  raw,
}: {
  channel: string;
  raw: string;
}): DjSession | null {
  let session: DjSession | null;
  try {
    session = JSON.parse(raw) as DjSession;
  } catch {
    session = null;
  }
  const stale =
    session?.status === 'pending' &&
    Date.now() - (session.updatedAt ?? 0) > dj.pendingTimeoutSeconds * 1000;
  if (!session || stale) {
    redis.hdel(keys.djSessions(), channel).catch(() => undefined);
    return null;
  }
  return session;
}

export async function getDjSession(channel: string): Promise<DjSession | null> {
  const raw = await redis.hget(keys.djSessions(), channel);
  return raw ? parseDjSession({ channel, raw }) : null;
}

export async function setDjSession({
  channel,
  session,
}: {
  channel: string;
  session: Omit<DjSession, 'updatedAt'>;
}): Promise<void> {
  await redis.hset(keys.djSessions(), {
    [channel]: JSON.stringify({ ...session, updatedAt: Date.now() }),
  });
}

export async function clearDjSession(channel: string): Promise<void> {
  await redis.hdel(keys.djSessions(), channel);
}

export async function listDjSessions(): Promise<
  { channel: string; session: DjSession }[]
> {
  const all = await redis.hgetall(keys.djSessions());
  return Object.entries(all).flatMap(([channel, raw]) => {
    const session = parseDjSession({ channel, raw });
    return session ? [{ channel, session }] : [];
  });
}

export async function appendAutoDjPicks({
  channel,
  picks,
}: {
  channel: string;
  picks: string[];
}): Promise<void> {
  const session = await getDjSession(channel);
  if (!session?.autoDj) {
    return;
  }
  await setDjSession({
    channel,
    session: {
      ...session,
      autoDj: {
        ...session.autoDj,
        picks: [...session.autoDj.picks, ...picks].slice(-dj.auto.historySize),
      },
    },
  });
}

export async function findDjSessionByRequest(
  requestTs: string
): Promise<{ channel: string; session: DjSession } | null> {
  const sessions = await listDjSessions();
  return (
    sessions.find(({ session }) => session.requestTs === requestTs) ?? null
  );
}

// A request cancelled while pending can still be approved later; remembering its
// channel lets Gork release the grant it no longer wants.
export async function markDjRequestAbandoned({
  requestTs,
  channel,
}: {
  requestTs: string;
  channel: string;
}): Promise<void> {
  await redis.set(
    keys.djAbandoned(requestTs),
    channel,
    'EX',
    dj.pendingTimeoutSeconds
  );
}

export async function takeAbandonedDjRequest(
  requestTs: string
): Promise<string | null> {
  const channel = await redis.get(keys.djAbandoned(requestTs));
  if (channel) {
    await redis.del(keys.djAbandoned(requestTs));
  }
  return channel;
}
