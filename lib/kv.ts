import { Redis } from "@upstash/redis";
import { Session, VocabWord, UserProfile, UserFacts } from "./types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ── Sessions ──────────────────────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  await redis.set(`session:${session.id}`, JSON.stringify(session));
  await redis.zadd(`sessions:${session.userId}`, {
    score: session.startedAt,
    member: session.id,
  });
}

export async function getSession(id: string): Promise<Session | null> {
  const data = await redis.get<string>(`session:${id}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function listSessions(userId: string, limit = 50): Promise<Session[]> {
  const ids = await redis.zrange<string[]>(`sessions:${userId}`, 0, limit - 1, { rev: true });
  if (!ids || ids.length === 0) return [];
  const sessions = await Promise.all(ids.map((id) => getSession(id)));
  return sessions.filter(Boolean) as Session[];
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  await redis.del(`session:${id}`);
  await redis.zrem(`sessions:${userId}`, id);
}

export async function getRecentSessions(userId: string, limit = 5): Promise<Session[]> {
  return listSessions(userId, limit);
}

// ── Vocabulary ────────────────────────────────────────────

export async function saveVocabWords(userId: string, words: string[]): Promise<void> {
  if (words.length === 0) return;
  const now = Date.now();
  const key = `vocab:${userId}`;
  let vocab: Record<string, VocabWord> = {};
  try {
    const existing = await redis.get<string>(key);
    if (existing) {
      vocab = typeof existing === "string" ? JSON.parse(existing) : existing;
    }
  } catch {}
  for (const word of words) {
    const k = word.toLowerCase();
    if (vocab[k]) {
      vocab[k].timesSeen += 1;
      vocab[k].lastSeen = now;
    } else {
      vocab[k] = { word, firstSeen: now, timesSeen: 1, lastSeen: now };
    }
  }
  await redis.set(key, JSON.stringify(vocab));
}

export async function getVocab(userId: string): Promise<VocabWord[]> {
  try {
    const data = await redis.get<string>(`vocab:${userId}`);
    if (!data) return [];
    const vocab: Record<string, VocabWord> =
      typeof data === "string" ? JSON.parse(data) : data;
    return Object.values(vocab).sort((a, b) => b.lastSeen - a.lastSeen);
  } catch {
    return [];
  }
}

export async function getUnpracticedWords(userId: string, limit = 10): Promise<string[]> {
  const vocab = await getVocab(userId);
  return vocab
    .filter((w) => !w.usedByUser && w.timesSeen <= 2)
    .slice(0, limit)
    .map((w) => w.word);
}

// ── User Profile ──────────────────────────────────────────

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await redis.set(`user:${profile.userId}`, JSON.stringify(profile));
  await redis.set(`email:${profile.email}`, profile.userId);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const data = await redis.get<string>(`user:${userId}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  return redis.get<string>(`email:${email}`);
}

export async function updateUserFacts(userId: string, facts: Partial<UserFacts>): Promise<void> {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  profile.facts = { ...profile.facts, ...facts, lastUpdated: Date.now() };
  profile.lastActiveAt = Date.now();
  await saveUserProfile(profile);
}

export async function updateStreak(userId: string): Promise<number> {
  const profile = await getUserProfile(userId);
  if (!profile) return 0;
  const now = Date.now();
  const lastCall = profile.lastCallDate ?? 0;
  const daysSince = Math.floor((now - lastCall) / (1000 * 60 * 60 * 24));
  if (daysSince <= 1) {
    profile.streak += 1;
  } else {
    profile.streak = 1;
  }
  profile.lastCallDate = now;
  profile.lastActiveAt = now;
  profile.totalSessions += 1;
  await saveUserProfile(profile);
  return profile.streak;
}

export async function getDaysSinceLastCall(userId: string): Promise<number> {
  const profile = await getUserProfile(userId);
  if (!profile?.lastCallDate) return 999;
  return Math.floor((Date.now() - profile.lastCallDate) / (1000 * 60 * 60 * 24));
}
