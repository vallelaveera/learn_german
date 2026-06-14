import { Redis } from "@upstash/redis";
import type { GrammarCategory, GrammarTier, VerifiedLevel } from "./verified-curriculum";
import { blockKey, tierBlockKey } from "./coverage";

const KEY_PREFIX = "grammar:extras:";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function storageKey(level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier): string {
  return `${KEY_PREFIX}${tierBlockKey(level, category, tier)}`;
}

function legacyStorageKey(level: VerifiedLevel, category: GrammarCategory): string {
  return `${KEY_PREFIX}${blockKey(level, category)}`;
}

export async function loadExtraExercises(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    let raw = await redis.get<string>(storageKey(level, category, tier));
    if (!raw && tier === "basic") {
      raw = await redis.get<string>(legacyStorageKey(level, category));
    }
    if (!raw) return [];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch (e) {
    console.error("[grammar-kv] load failed:", e);
    return [];
  }
}

export async function loadAllExtraCounts(): Promise<Record<string, number>> {
  const redis = getRedis();
  if (!redis) return {};
  try {
    const keys = await redis.keys(`${KEY_PREFIX}*`);
    if (!keys.length) return {};
    const values = await redis.mget<(string | null)[]>(...keys);
    const out: Record<string, number> = {};
    keys.forEach((key, i) => {
      const shortKey = key.replace(KEY_PREFIX, "");
      const raw = values[i];
      if (!raw) {
        out[shortKey] = 0;
        return;
      }
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        out[shortKey] = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        out[shortKey] = 0;
      }
    });
    return out;
  } catch (e) {
    console.error("[grammar-kv] load counts failed:", e);
    return {};
  }
}

export async function appendExtraExercises(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
  additions: string[],
): Promise<{ saved: number; total: number }> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("KV not configured — cannot save grammar exercises");
  }
  const existing = await loadExtraExercises(level, category, tier);
  const seen = new Set(existing.map(s => s.trim()));
  const merged = [...existing];
  let saved = 0;
  for (const spec of additions) {
    const trimmed = spec.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    merged.push(trimmed);
    seen.add(trimmed);
    saved += 1;
  }
  await redis.set(storageKey(level, category, tier), JSON.stringify(merged));
  return { saved, total: merged.length };
}
