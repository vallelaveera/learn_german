import type { GrammarCategory, GrammarTier, VerifiedLevel } from "./verified-curriculum";
import { VERIFIED_LEVELS } from "./verified-curriculum";

const STORAGE_KEY = "grammar_catalog_tiers_v1";

export function grammarTierKey(level: VerifiedLevel, category: GrammarCategory): string {
  return `${level}:${category}`;
}

export function loadGrammarTier(level: VerifiedLevel, category: GrammarCategory): GrammarTier {
  if (typeof window === "undefined") return "basic";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "basic";
    const parsed = JSON.parse(raw) as Record<string, GrammarTier>;
    return parsed[grammarTierKey(level, category)] === "advanced" ? "advanced" : "basic";
  } catch {
    return "basic";
  }
}

export function saveGrammarTier(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, GrammarTier>) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...existing, [grammarTierKey(level, category)]: tier }),
    );
  } catch {
    // ignore
  }
}

export function parseVerifiedLevel(
  param: string | null,
  fallback: VerifiedLevel = "A1",
): VerifiedLevel {
  if (param && VERIFIED_LEVELS.includes(param as VerifiedLevel)) {
    return param as VerifiedLevel;
  }
  return fallback;
}

export function parseGrammarTier(param: string | null): GrammarTier {
  return param === "advanced" ? "advanced" : "basic";
}
