import { Redis } from "@upstash/redis";
import type { PlanId } from "./plans";
import { PLANS } from "./plans";
import { isBillingEnabled, BILLING_DISABLED_LIMIT, billingDisabledUsageStats } from "./billing-config";
import type { CallCorrection } from "./corrections";
import { Session, VocabWord, UserProfile, UserFacts, UserFeatures, HomeworkAssignment, HomeworkRep, HomeworkSentence } from "./types";
import type { CareerVocabUserProgress } from "./career-vocab/types";
import type { UserFeedback } from "./feedback/types";
import { normalizeGermanLevel } from "./levels";
import type { PracticeReportSummary, PracticeSessionReport } from "./exercises/session-report-types";
import { v4 as uuidv4 } from "uuid";
import { getOrGenerateIcon } from "./vocab/icons";

function isAssignmentComplete(assignment: HomeworkAssignment): boolean {
  const totalReps = assignment.sentences.length * 3;
  let completedReps = 0;
  for (const sentence of assignment.sentences) {
    completedReps += (assignment.progress[sentence.id] ?? []).length;
  }
  return completedReps >= totalReps && totalReps > 0;
}

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
      void getOrGenerateIcon(word).catch(err =>
        console.error("Icon gen failed:", err),
      );
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

export async function updateVocabStatus(
  userId: string,
  wordId: string,
  correct: boolean,
): Promise<VocabWord | null> {
  const k = wordId.toLowerCase().trim();
  if (!k) return null;

  const redisKey = `vocab:${userId}`;
  const now = Date.now();
  let vocab: Record<string, VocabWord> = {};

  try {
    const data = await redis.get<string>(redisKey);
    if (data) {
      vocab = typeof data === "string" ? JSON.parse(data) : data;
    }
  } catch {
    return null;
  }

  if (!vocab[k]) {
    vocab[k] = {
      word: wordId.trim(),
      firstSeen: now,
      timesSeen: 0,
      lastSeen: now,
      correctCount: 0,
    };
  }

  vocab[k].timesSeen += 1;
  if (correct) {
    vocab[k].correctCount = (vocab[k].correctCount ?? 0) + 1;
  }
  vocab[k].lastSeen = now;

  await redis.set(redisKey, JSON.stringify(vocab));
  return vocab[k];
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

/** Permanently remove a user and all associated Redis data. */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;

  const sessions = await listSessions(userId, 9999);
  for (const session of sessions) {
    await redis.del(`session:${session.id}`);
    await clearSessionBilledMinutes(userId, session.id);
  }
  await redis.del(`sessions:${userId}`);

  const legacyActiveId = await redis.get<string>(`homework:active:${userId}`);
  const pendingIds = (await redis.zrange<string[]>(`homework:pending:${userId}`, 0, -1)) ?? [];
  const historyIds = (await redis.zrange<string[]>(`homework:history:${userId}`, 0, -1)) ?? [];
  const homeworkIds = Array.from(new Set([
    ...pendingIds,
    ...historyIds,
    ...(legacyActiveId ? [legacyActiveId] : []),
  ]));
  for (const homeworkId of homeworkIds) {
    await redis.del(`homework:${homeworkId}`);
  }
  await redis.del(
    `homework:pending:${userId}`,
    `homework:history:${userId}`,
    `homework:active:${userId}`,
  );

  const audioKeys = await redis.keys(`homework:audio:${userId}:*`);
  if (audioKeys.length > 0) await redis.del(...audioKeys);

  const ownerId = await redis.get<string>(`pro_owner:${userId}`);
  if (ownerId) await removeProShareMemberId(ownerId, userId);
  const shareMembers = await listProShareMemberIds(userId);
  for (const memberId of shareMembers) {
    await removeProShareMemberId(userId, memberId);
  }
  await redis.del(`pro_share:${userId}`, `pro_owner:${userId}`);

  const minuteKeys = await redis.keys(`minutes:${userId}:*`);
  const billedKeys = await redis.keys(`session_billed:${userId}:*`);

  await redis.del(
    `user:${userId}`,
    `email:${profile.email}`,
    `vocab:${userId}`,
    `limit:${userId}`,
    `features:${userId}`,
    `exercise_results:${userId}`,
    `career_vocab:${userId}`,
    `call_corrections:${userId}`,
    ...minuteKeys,
    ...billedKeys,
  );

  return true;
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

async function getEffectivePlanForUser(profile: UserProfile): Promise<PlanId> {
  let subject = profile;
  if (profile.proOwnerId) {
    const owner = await getUserProfile(profile.proOwnerId);
    if (!owner) return "free";
    subject = owner;
  }
  const plan = subject.plan ?? "free";
  if (plan === "free") return "free";
  if ((subject.subscriptionExpiresAt ?? 0) > Date.now()) return plan;
  return "free";
}

export async function getEffectivePlanAsync(profile: UserProfile): Promise<PlanId> {
  return getEffectivePlanForUser(profile);
}

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
  if (!isBillingEnabled()) return BILLING_DISABLED_LIMIT;
  try {
    const override = await redis.get<number>(`limit:${userId}`);
    if (override != null && override > 0) return override;
    const profile = await getUserProfile(userId);
    if (!profile) return PLANS.free.monthlyMinutes;
    const plan = await getEffectivePlanAsync(profile);
    return PLANS[plan].monthlyMinutes;
  } catch {
    return PLANS.free.monthlyMinutes;
  }
}

export async function setUserLimit(userId: string, minutes: number): Promise<void> {
  await redis.set(`limit:${userId}`, minutes);
}

export async function getUsageStats(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
  if (!isBillingEnabled()) return billingDisabledUsageStats();
  const [used, limit] = await Promise.all([
    getMonthlyMinutes(userId),
    getUserLimit(userId),
  ]);
  return { used: Math.round(used), limit, remaining: Math.max(0, limit - Math.round(used)) };
}

export async function isUsageAllowed(userId: string): Promise<boolean> {
  if (!isBillingEnabled()) return true;
  const usage = await getUsageStats(userId);
  return usage.remaining > 0;
}

export async function getSessionBilledMinutes(
  userId: string,
  sessionId: string,
): Promise<number> {
  try {
    const val = await redis.get<number>(`session_billed:${userId}:${sessionId}`);
    return val ?? 0;
  } catch {
    return 0;
  }
}

export async function incrementSessionBilledMinutes(
  userId: string,
  sessionId: string,
  minutes: number,
): Promise<number> {
  const key = `session_billed:${userId}:${sessionId}`;
  try {
    const next = await redis.incrbyfloat(key, minutes);
    await redis.expire(key, 48 * 60 * 60);
    return next;
  } catch {
    return 0;
  }
}

export async function clearSessionBilledMinutes(
  userId: string,
  sessionId: string,
): Promise<void> {
  try {
    await redis.del(`session_billed:${userId}:${sessionId}`);
  } catch {
    /* ignore */
  }
}

export async function tickUsageMinute(
  userId: string,
  sessionId: string,
): Promise<{ used: number; limit: number; remaining: number; limitReached: boolean }> {
  if (!isBillingEnabled()) {
    return { ...billingDisabledUsageStats(), limitReached: false };
  }
  await addMinutes(userId, 1);
  await incrementSessionBilledMinutes(userId, sessionId, 1);
  const usage = await getUsageStats(userId);
  return { ...usage, limitReached: usage.remaining <= 0 };
}

export async function settleCallUsage(
  userId: string,
  sessionId: string,
  sessionStart: number,
): Promise<{ used: number; limit: number; remaining: number }> {
  if (!isBillingEnabled()) return billingDisabledUsageStats();
  const elapsedMs = Math.max(0, Date.now() - sessionStart);
  const totalMinutes = Math.ceil(elapsedMs / 60000);
  const billed = await getSessionBilledMinutes(userId, sessionId);
  const delta = Math.max(0, totalMinutes - Math.round(billed));
  if (delta > 0) await addMinutes(userId, delta);
  await clearSessionBilledMinutes(userId, sessionId);
  return getUsageStats(userId);
}

export async function listProShareMemberIds(ownerId: string): Promise<string[]> {
  try {
    return (await redis.get<string[]>(`pro_share:${ownerId}`)) ?? [];
  } catch {
    return [];
  }
}

export async function addProShareMember(ownerId: string, memberId: string): Promise<void> {
  const existing = await listProShareMemberIds(ownerId);
  await redis.set(`pro_share:${ownerId}`, [...existing, memberId]);
  await redis.set(`pro_owner:${memberId}`, ownerId);
}

export async function removeProShareMemberId(
  ownerId: string,
  memberId: string,
): Promise<void> {
  const existing = await listProShareMemberIds(ownerId);
  await redis.set(
    `pro_share:${ownerId}`,
    existing.filter(id => id !== memberId),
  );
  await redis.del(`pro_owner:${memberId}`);
}

export async function saveWordExamples(word: string, sentences: string[]): Promise<void> {
  await redis.set(`examples:${word.toLowerCase()}`, JSON.stringify(sentences));
}

// ── Exercise results ───────────────────────────────────────

export interface StoredExerciseResult {
  itemId: string;
  german: string;
  correct: boolean;
  type: "warmup" | "placement" | "sentence";
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
    const merged = [...prev, ...results].slice(-500);
    await redis.set(key, JSON.stringify(merged));
  } catch {}
}

export const EXERCISE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/** @deprecated use EXERCISE_COOLDOWN_MS */
export const EXERCISE_MASTERED_MS = EXERCISE_COOLDOWN_MS;
export const EXERCISE_LIFETIME_MASTERED = 3;

async function loadExerciseResults(userId: string): Promise<StoredExerciseResult[]> {
  try {
    const data = await redis.get<string>(`exercise_results:${userId}`);
    if (!data) return [];
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return [];
  }
}

function exerciseResultAliases(r: StoredExerciseResult): string[] {
  const aliases: string[] = [];
  if (r.itemId) aliases.push(r.itemId);
  if (r.german) {
    const g = r.german.toLowerCase().trim();
    if (g) {
      aliases.push(g);
      aliases.push(`g:${g}`);
    }
  }
  return aliases;
}

function exerciseResultPrimaryKey(r: StoredExerciseResult): string | null {
  if (r.itemId) return r.itemId;
  if (r.german) {
    const g = r.german.toLowerCase().trim();
    if (g) return `g:${g}`;
  }
  return null;
}

/**
 * Keys to skip when selecting exercises:
 * - any item answered correctly in the last 7 days (weekly cooldown)
 * - any item answered correctly 3+ times lifetime (permanently mastered)
 */
export async function getExerciseExcludedKeys(
  userId: string,
  type: StoredExerciseResult["type"]
): Promise<Set<string>> {
  const excluded = new Set<string>();
  const cutoff = Date.now() - EXERCISE_COOLDOWN_MS;
  const lifetimeCorrect = new Map<string, number>();
  const aliasesByPrimary = new Map<string, Set<string>>();

  const results = await loadExerciseResults(userId);
  for (const r of results) {
    if (r.type !== type || !r.correct) continue;
    const primary = exerciseResultPrimaryKey(r);
    if (!primary) continue;

    const aliases = exerciseResultAliases(r);
    if (!aliasesByPrimary.has(primary)) aliasesByPrimary.set(primary, new Set());
    for (const a of aliases) aliasesByPrimary.get(primary)!.add(a);

    lifetimeCorrect.set(primary, (lifetimeCorrect.get(primary) ?? 0) + 1);
    if (r.ts >= cutoff) {
      for (const a of aliases) excluded.add(a);
    }
  }

  for (const [primary, count] of Array.from(lifetimeCorrect.entries())) {
    if (count >= EXERCISE_LIFETIME_MASTERED) {
      const aliases = aliasesByPrimary.get(primary);
      if (aliases) {
        for (const a of Array.from(aliases)) excluded.add(a);
      }
    }
  }

  return excluded;
}

// ── Practice session reports ───────────────────────────────

export async function savePracticeReport(
  userId: string,
  report: Omit<PracticeSessionReport, "id" | "userId">,
): Promise<PracticeSessionReport> {
  const id = uuidv4();
  const full: PracticeSessionReport = { ...report, id, userId };
  await redis.set(`practice_report:${userId}:${id}`, JSON.stringify(full));
  await redis.zadd(`practice_reports:${userId}`, {
    score: full.endedAt,
    member: id,
  });
  return full;
}

export async function getPracticeReport(
  userId: string,
  id: string,
): Promise<PracticeSessionReport | null> {
  try {
    const data = await redis.get<string>(`practice_report:${userId}:${id}`);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}

export async function listPracticeReports(
  userId: string,
  limit = 30,
): Promise<PracticeReportSummary[]> {
  try {
    const ids = await redis.zrange<string[]>(`practice_reports:${userId}`, 0, limit - 1, { rev: true });
    if (!ids?.length) return [];
    const reports = await Promise.all(ids.map(id => getPracticeReport(userId, id)));
    return reports
      .filter((r): r is PracticeSessionReport => Boolean(r))
      .map(r => ({
        id: r.id,
        type: r.type,
        category: r.category,
        title: r.title,
        score: r.score,
        total: r.total,
        endedAt: r.endedAt,
      }));
  } catch {
    return [];
  }
}

export async function deletePracticeReport(userId: string, id: string): Promise<void> {
  await redis.del(`practice_report:${userId}:${id}`);
  await redis.zrem(`practice_reports:${userId}`, id);
}

/** @deprecated use getExerciseExcludedKeys */
export async function getExerciseMasteredKeys(
  userId: string,
  type: StoredExerciseResult["type"],
  withinMs = EXERCISE_COOLDOWN_MS
): Promise<Set<string>> {
  void withinMs;
  return getExerciseExcludedKeys(userId, type);
}

export async function getWarmupMasteredKeys(
  userId: string,
  withinMs = EXERCISE_COOLDOWN_MS
): Promise<Set<string>> {
  void withinMs;
  return getExerciseExcludedKeys(userId, "warmup");
}

export async function isPlacementDone(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return !!profile?.facts.placementDone || !!profile?.facts.levelOnboarded;
}

export async function completePlacement(
  userId: string,
  level: string,
  score: number
): Promise<void> {
  const normalized = normalizeGermanLevel(level);
  const profile = await getUserProfile(userId);
  if (!profile) return;
  profile.germanLevel = normalized;
  profile.facts = {
    ...profile.facts,
    placementDone: true,
    placementScore: score,
    germanLevel: normalized,
    levelOnboarded: true,
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

// ── Call corrections ───────────────────────────────────────

const CORRECTIONS_CAP = 100;

async function getAllCallCorrections(userId: string): Promise<CallCorrection[]> {
  try {
    const data = await redis.get<string>(`call_corrections:${userId}`);
    if (!data) return [];
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return [];
  }
}

export async function saveSessionCorrections(
  userId: string,
  sessionId: string,
  corrections: CallCorrection[],
): Promise<void> {
  if (!corrections.length) return;
  const all = await getAllCallCorrections(userId);
  const withoutSession = all.filter(c => c.sessionId !== sessionId);
  const merged = [...withoutSession, ...corrections].slice(-CORRECTIONS_CAP);
  await redis.set(`call_corrections:${userId}`, JSON.stringify(merged));
}

export async function getSessionCorrections(
  userId: string,
  sessionId: string,
): Promise<CallCorrection[]> {
  const all = await getAllCallCorrections(userId);
  return all.filter(c => c.sessionId === sessionId);
}

export async function getUnpracticedCorrections(
  userId: string,
  limit = 5,
): Promise<CallCorrection[]> {
  const all = await getAllCallCorrections(userId);
  return all.filter(c => !c.practiced).slice(-limit);
}

export async function markCorrectionsPracticed(
  userId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const idSet = new Set(ids);
  const all = await getAllCallCorrections(userId);
  const updated = all.map(c => (idSet.has(c.id) ? { ...c, practiced: true } : c));
  await redis.set(`call_corrections:${userId}`, JSON.stringify(updated));
}

// ── User features ─────────────────────────────────────────

export async function getUserFeatures(userId: string): Promise<UserFeatures> {
  try {
    const data = await redis.get<string>(`features:${userId}`);
    if (!data) return {};
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return {};
  }
}

export async function setUserFeature(
  userId: string,
  feature: keyof UserFeatures,
  value: boolean
): Promise<void> {
  const features = await getUserFeatures(userId);
  features[feature] = value;
  await redis.set(`features:${userId}`, JSON.stringify(features));
}

// ── Homework ──────────────────────────────────────────────

async function migrateLegacyActiveHomework(userId: string): Promise<void> {
  const legacyId = await redis.get<string>(`homework:active:${userId}`);
  if (!legacyId) return;
  const assignment = await getHomework(legacyId);
  if (assignment && assignment.status === "pending") {
    await redis.zadd(`homework:pending:${userId}`, {
      score: assignment.createdAt,
      member: assignment.id,
    });
  }
  await redis.del(`homework:active:${userId}`);
}

export async function getHomework(id: string): Promise<HomeworkAssignment | null> {
  const data = await redis.get<string>(`homework:${id}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function saveHomeworkRecord(assignment: HomeworkAssignment): Promise<void> {
  await redis.set(`homework:${assignment.id}`, JSON.stringify(assignment));
}

export async function getPendingHomeworkList(userId: string): Promise<HomeworkAssignment[]> {
  await migrateLegacyActiveHomework(userId);
  const ids = await redis.zrange<string[]>(`homework:pending:${userId}`, 0, -1);
  if (!ids?.length) return [];

  const records = await Promise.all(ids.map(id => getHomework(id)));
  const pending: HomeworkAssignment[] = [];

  for (const assignment of records) {
    if (!assignment) continue;
    if (isAssignmentComplete(assignment)) {
      assignment.status = "completed";
      await redis.zrem(`homework:pending:${userId}`, assignment.id);
      await redis.zadd(`homework:history:${userId}`, {
        score: Date.now(),
        member: assignment.id,
      });
      await saveHomeworkRecord(assignment);
      continue;
    }
    if (assignment.status === "pending") {
      pending.push(assignment);
    }
  }

  return pending;
}

export async function getHomeworkHistoryList(
  userId: string,
  limit = 30,
): Promise<HomeworkAssignment[]> {
  const ids = await redis.zrange<string[]>(`homework:history:${userId}`, 0, -1, { rev: true });
  if (!ids?.length) return [];

  const records = await Promise.all(ids.slice(0, limit).map(id => getHomework(id)));
  return records
    .filter((a): a is HomeworkAssignment => a !== null)
    .sort((a, b) => {
      const aDone = a.status === "completed" ? 1 : 0;
      const bDone = b.status === "completed" ? 1 : 0;
      if (aDone !== bDone) return bDone - aDone;
      return b.createdAt - a.createdAt;
    });
}

export async function getActiveHomework(userId: string): Promise<HomeworkAssignment | null> {
  const list = await getPendingHomeworkList(userId);
  return list[0] ?? null;
}

export async function archiveActiveHomework(userId: string): Promise<void> {
  const pending = await getPendingHomeworkList(userId);
  for (const active of pending) {
    await redis.zadd(`homework:history:${userId}`, {
      score: active.createdAt,
      member: active.id,
    });
    await redis.zrem(`homework:pending:${userId}`, active.id);
  }
}

export async function saveHomework(
  userId: string,
  sessionId: string | undefined,
  sentences: HomeworkSentence[],
  topic?: string
): Promise<string> {
  const assignment: HomeworkAssignment = {
    id: uuidv4(),
    userId,
    sessionId,
    topic,
    createdAt: Date.now(),
    status: "pending",
    sentences,
    progress: {},
  };

  await saveHomeworkRecord(assignment);
  await redis.zadd(`homework:pending:${userId}`, {
    score: assignment.createdAt,
    member: assignment.id,
  });
  return assignment.id;
}

export async function updateHomeworkProgress(
  homeworkId: string,
  sentenceId: string,
  rep: HomeworkRep
): Promise<HomeworkAssignment | null> {
  const assignment = await getHomework(homeworkId);
  if (!assignment) return null;

  const existing = assignment.progress[sentenceId] ?? [];
  const filtered = existing.filter(r => r.repIndex !== rep.repIndex);
  assignment.progress[sentenceId] = [...filtered, rep].sort((a, b) => a.repIndex - b.repIndex);

  if (isAssignmentComplete(assignment)) {
    assignment.status = "completed";
    await redis.zrem(`homework:pending:${assignment.userId}`, assignment.id);
    await redis.zadd(`homework:history:${assignment.userId}`, {
      score: Date.now(),
      member: assignment.id,
    });
  }

  await saveHomeworkRecord(assignment);
  return assignment;
}

export async function skipHomework(homeworkId: string): Promise<HomeworkAssignment | null> {
  const assignment = await getHomework(homeworkId);
  if (!assignment) return null;
  assignment.status = "skipped";
  await saveHomeworkRecord(assignment);
  await redis.zrem(`homework:pending:${assignment.userId}`, homeworkId);
  await redis.zadd(`homework:history:${assignment.userId}`, {
    score: Date.now(),
    member: assignment.id,
  });
  return assignment;
}

export async function clearActiveHomework(userId: string): Promise<void> {
  const pending = await getPendingHomeworkList(userId);
  for (const active of pending) {
    active.status = "skipped";
    await saveHomeworkRecord(active);
    await redis.zrem(`homework:pending:${userId}`, active.id);
  }
  await redis.del(`homework:active:${userId}`);
}

// ── Product feedback ──────────────────────────────────────

export async function saveUserFeedback(feedback: UserFeedback): Promise<void> {
  await redis.set(`feedback:${feedback.id}`, JSON.stringify(feedback));
  await redis.zadd("feedback:all", { score: feedback.createdAt, member: feedback.id });
}

export async function listUserFeedback(limit = 100): Promise<UserFeedback[]> {
  const ids = await redis.zrange<string[]>("feedback:all", 0, limit - 1, { rev: true });
  if (!ids?.length) return [];
  const rows = await Promise.all(
    ids.map(async id => {
      const data = await redis.get<string>(`feedback:${id}`);
      if (!data) return null;
      return (typeof data === "string" ? JSON.parse(data) : data) as UserFeedback;
    }),
  );
  return rows.filter(Boolean) as UserFeedback[];
}
