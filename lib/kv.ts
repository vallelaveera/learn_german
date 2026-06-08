import { kv } from "@vercel/kv";
import { Session } from "./types";

const SESSION_LIST_KEY = "sessions:index";

export async function saveSession(session: Session): Promise<void> {
  await kv.set(`session:${session.id}`, session);
  await kv.zadd(SESSION_LIST_KEY, {
    score: session.startedAt,
    member: session.id,
  });
}

export async function getSession(id: string): Promise<Session | null> {
  return kv.get<Session>(`session:${id}`);
}

export async function listSessions(limit = 50): Promise<Session[]> {
  const ids = await kv.zrange<string[]>(SESSION_LIST_KEY, 0, limit - 1, {
    rev: true,
  });
  if (!ids || ids.length === 0) return [];
  const sessions = await Promise.all(ids.map((id) => getSession(id)));
  return sessions.filter(Boolean) as Session[];
}

export async function deleteSession(id: string): Promise<void> {
  await kv.del(`session:${id}`);
  await kv.zrem(SESSION_LIST_KEY, id);
}
