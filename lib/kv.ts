import { Redis } from "@upstash/redis";
import { Session } from "./types";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SESSION_LIST_KEY = "sessions:index";

export async function saveSession(session: Session): Promise<void> {
  await redis.set(`session:${session.id}`, JSON.stringify(session));
  await redis.zadd(SESSION_LIST_KEY, { score: session.startedAt, member: session.id });
}

export async function getSession(id: string): Promise<Session | null> {
  const data = await redis.get<string>(`session:${id}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function listSessions(limit = 50): Promise<Session[]> {
  const ids = await redis.zrange<string[]>(SESSION_LIST_KEY, 0, limit - 1, { rev: true });
  if (!ids || ids.length === 0) return [];
  const sessions = await Promise.all(ids.map((id) => getSession(id)));
  return sessions.filter(Boolean) as Session[];
}

export async function deleteSession(id: string): Promise<void> {
  await redis.del(`session:${id}`);
  await redis.zrem(SESSION_LIST_KEY, id);
}
