import { Redis } from "@upstash/redis";
import { Session, VocabWord, UserProfile, UserFacts } from "./types";
import type { CareerVocabUserProgress } from "./career-vocab/types";

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

export async function markWordsUsedByUser(userId: string, words: string[]): Promise<void> {
  if (!words.length) return;
  const key = `vocab:${userId}`;
  try {
    const data = await redis.get<string>(key);
    if (!data) return;
    const vocab: Record<string, VocabWord> = typeof data === "string" ? JSON.parse(data) : data;
    for (const word of words) {
      const k = word.toLowerCase();
      if (vocab[k]) vocab[k].usedByUser = true;
    }
    await redis.set(key, JSON.stringify(vocab));
  } catch {}
}

export async function getNewWordsForSession(userId: string, sessionMessages: import("./types").Message[]): Promise<string[]> {
  // Get all words Maya used in this session
  const mayaText = sessionMessages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join(" ");

  const userText = sessionMessages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const wordPattern = /[a-zA-ZäöüÄÖÜß]{4,20}/g;
  const mayaWords = Array.from(new Set(mayaText.match(wordPattern) || []));
  const userWordSet = new Set((userText.match(/[a-zA-ZäöüÄÖÜß]{3,}/g) || []).map(w => w.toLowerCase()));

  const stopwords = new Set(["dass","eine","einen","einem","einer","nicht","auch","noch","oder","aber","dein","mein","sein","haben","waren","wird","sind","hast","habe","kann","wenn","dann","mehr","sehr","sich","wäre","hallo","schön","gerne","immer","etwas","heute","jetzt","ihre","beim","nach","über","doch","hier","dort","wann","weil","denn","dich","mich","ihn","ihr","wie","was","wer","nur","mal","aus","mit","von","zum","zur","das","die","der","ein","und","ist","hat","bin","war","ich","sie","wir","man","dem","den"]);

  // Words Maya used that user never said in this session
  const newInSession = mayaWords
    .filter(w => w.length >= 4 && w.length <= 20)
    .filter(w => /^[a-zA-ZäöüÄÖÜß]+$/.test(w))
    .filter(w => !userWordSet.has(w.toLowerCase()))
    .filter(w => !stopwords.has(w.toLowerCase()))
    .filter(w => /[A-ZÄÖÜ]/.test(w[0]) || w.length >= 6);

  // Also check against ALL previous sessions from DB
  const vocab = await getVocab(userId);
  const practicedBefore = new Set(vocab.filter(v => v.usedByUser).map(v => v.word.toLowerCase()));

  return newInSession
    .filter(w => !practicedBefore.has(w.toLowerCase()))
    .slice(0, 15);
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

// ── Usage limits ─────────────────────────────────────────

export async function getMonthlyMinutes(userId: string): Promise<number> {
  const key = `minutes:${userId}:${new Date().toISOString().slice(0, 7)}`; // e.g. minutes:xxx:2026-06
  try {
    const val = await redis.get<number>(key);
    return val ?? 0;
  } catch { return 0; }
}

export async function addMinutes(userId: string, minutes: number): Promise<number> {
  const key = `minutes:${userId}:${new Date().toISOString().slice(0, 7)}`;
  try {
    const newVal = await redis.incrbyfloat(key, minutes);
    // Expire key after 35 days (auto cleanup)
    await redis.expire(key, 35 * 24 * 60 * 60);
    return newVal;
  } catch { return 0; }
}

export async function getUserLimit(userId: string): Promise<number> {
  try {
    const val = await redis.get<number>(`limit:${userId}`);
    return val ?? 30; // default 30 minutes
  } catch { return 30; }
}

export async function setUserLimit(userId: string, minutes: number): Promise<void> {
  await redis.set(`limit:${userId}`, minutes);
}

export async function getUsageStats(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
  const [used, limit] = await Promise.all([
    getMonthlyMinutes(userId),
    getUserLimit(userId),
  ]);
  return { used: Math.round(used), limit, remaining: Math.max(0, limit - Math.round(used)) };
}

export async function isUsageAllowed(userId: string): Promise<boolean> {
  const usage = await getUsageStats(userId);
  return usage.remaining > 0;
}

export async function saveWordExamples(word: string, sentences: string[]): Promise<void> {
  await redis.set(`examples:${word.toLowerCase()}`, JSON.stringify(sentences));
}

// ── Exercise results ───────────────────────────────────────

export interface StoredExerciseResult {
  itemId: string;
  german: string;
  correct: boolean;
  type: "warmup" | "placement" | "spelling";
  ts: number;
}

export async function saveExerciseResults(
  userId: string,
  results: StoredExerciseResult[]
): Promise<void> {
  if (!results.length) return;
  const key = `exercise_results:${userId}`;
  try {
    const existing = await redis.get<string>(key);
    const prev: StoredExerciseResult[] = existing
      ? (typeof existing === "string" ? JSON.parse(existing) : existing)
      : [];
    const merged = [...prev, ...results].slice(-200);
    await redis.set(key, JSON.stringify(merged));
  } catch {}
}

export async function isPlacementDone(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return !!profile?.facts.placementDone;
}

export async function completePlacement(
  userId: string,
  level: string,
  score: number
): Promise<void> {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  profile.germanLevel = level;
  profile.facts = {
    ...profile.facts,
    placementDone: true,
    placementScore: score,
    germanLevel: level,
    lastUpdated: Date.now(),
  };
  profile.lastActiveAt = Date.now();
  await saveUserProfile(profile);
}

// ── Career vocabulary progress ─────────────────────────────

function emptyCareerVocabProgress(userId: string): CareerVocabUserProgress {
  return { userId, updatedAt: Date.now(), entries: {} };
}

export async function getCareerVocabProgress(userId: string): Promise<CareerVocabUserProgress> {
  try {
    const data = await redis.get<string>(`career_vocab:${userId}`);
    if (!data) return emptyCareerVocabProgress(userId);
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return {
      userId,
      updatedAt: parsed.updatedAt ?? Date.now(),
      entries: parsed.entries ?? {},
    };
  } catch {
    return emptyCareerVocabProgress(userId);
  }
}

export async function updateCareerVocabProgress(
  userId: string,
  userMatchedIds: string[],
  mayaMatchedIds: string[]
): Promise<void> {
  if (!userMatchedIds.length && !mayaMatchedIds.length) return;

  const now = Date.now();
  const progress = await getCareerVocabProgress(userId);

  for (let i = 0; i < userMatchedIds.length; i++) {
    const id = userMatchedIds[i];
    const existing = progress.entries[id];
    if (existing) {
      existing.usedByUser = true;
      existing.timesUsed = (existing.timesUsed ?? 0) + 1;
      existing.lastUsedAt = now;
      if (!existing.firstUsedAt) existing.firstUsedAt = now;
    } else {
      progress.entries[id] = {
        entryId: id,
        usedByUser: true,
        timesUsed: 1,
        firstUsedAt: now,
        lastUsedAt: now,
      };
    }
  }

  for (let j = 0; j < mayaMatchedIds.length; j++) {
    const id = mayaMatchedIds[j];
    const existing = progress.entries[id];
    if (existing) {
      existing.exposedByMaya = true;
    } else {
      progress.entries[id] = {
        entryId: id,
        usedByUser: false,
        timesUsed: 0,
        exposedByMaya: true,
      };
    }
  }

  progress.updatedAt = now;
  await redis.set(`career_vocab:${userId}`, JSON.stringify(progress));
}

export async function getWordExamples(word: string): Promise<string[] | null> {
  try {
    const data = await redis.get<string>(`examples:${word.toLowerCase()}`);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}
