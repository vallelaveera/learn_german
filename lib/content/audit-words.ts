import {
  deeplCorrectGerman,
  deeplTranslateDeToEn,
  getDeepLAuditLabel,
  isDeepLConfigured,
  probeDeepLWrite,
} from "./deepl-client";
import type { SavedWord } from "@/lib/vocab/types";

export interface AuditWordFinding {
  id: string;
  de: string;
  en: string;
  level: string;
  issues: string[];
}

export interface AuditWordsSummary {
  provider: "deepl";
  providerLabel: string;
  checked: number;
  flagged: number;
  passed: number;
  findings: AuditWordFinding[];
}

function normalizeEnglish(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeGerman(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function translationsAlign(storedEn: string, deeplEn: string): boolean {
  const stored = normalizeEnglish(storedEn);
  const translated = normalizeEnglish(deeplEn);
  if (!stored || !translated) return false;
  if (stored === translated) return true;
  if (stored.includes(translated) || translated.includes(stored)) return true;

  const storedWords = new Set(stored.split(" ").filter(w => w.length > 2));
  const translatedWords = new Set(translated.split(" ").filter(w => w.length > 2));
  if (storedWords.size === 0 || translatedWords.size === 0) return stored === translated;

  let overlap = 0;
  storedWords.forEach(word => {
    if (translatedWords.has(word)) overlap++;
  });
  return overlap / Math.min(storedWords.size, translatedWords.size) >= 0.5;
}

function distractorMatchesTranslation(distractors: string[], deeplEn: string): string | null {
  const translated = normalizeEnglish(deeplEn);
  for (const distractor of distractors) {
    const norm = normalizeEnglish(distractor);
    if (norm && (norm === translated || translated.includes(norm) || norm.includes(translated))) {
      return distractor;
    }
  }
  return null;
}

async function auditSingleWord(
  word: SavedWord,
  writeEnabled: boolean,
): Promise<AuditWordFinding | null> {
  const issues: string[] = [];

  try {
    const deeplEn = await deeplTranslateDeToEn(word.de);
    if (!deeplEn) {
      issues.push("DeepL returned no English translation");
    } else if (!translationsAlign(word.en, deeplEn)) {
      issues.push(`Translation mismatch — stored «${word.en}», DeepL suggests «${deeplEn}»`);
    }

    const badDistractor = distractorMatchesTranslation(word.distractors, deeplEn);
    if (badDistractor) {
      issues.push(`Distractor «${badDistractor}» matches DeepL translation «${deeplEn}»`);
    }

    if (writeEnabled) {
      const corrected = await deeplCorrectGerman(word.de);
      if (corrected && normalizeGerman(corrected) !== normalizeGerman(word.de)) {
        issues.push(`DeepL corrected German: «${corrected}» (stored: «${word.de}»)`);
      }
    }
  } catch (e) {
    console.error(`[audit-words] DeepL failed for ${word.de}:`, e);
    return {
      id: word.id,
      de: word.de,
      en: word.en,
      level: word.level,
      issues: ["DeepL audit call failed — manual review recommended"],
    };
  }

  if (issues.length === 0) return null;
  return { id: word.id, de: word.de, en: word.en, level: word.level, issues };
}

export async function auditSavedWords(
  words: SavedWord[],
  options: { limit?: number; concurrency?: number } = {},
): Promise<AuditWordsSummary> {
  if (!isDeepLConfigured()) {
    throw new Error("DEEPL_AUTH_KEY not configured");
  }

  const writeEnabled = await probeDeepLWrite();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const concurrency = Math.min(Math.max(options.concurrency ?? 3, 1), 5);
  const batch = words.slice(0, limit);

  const findings: AuditWordFinding[] = [];
  let index = 0;

  async function worker() {
    while (index < batch.length) {
      const i = index++;
      const finding = await auditSingleWord(batch[i], writeEnabled);
      if (finding) findings.push(finding);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, () => worker()));

  return {
    provider: "deepl",
    providerLabel: getDeepLAuditLabel(writeEnabled),
    checked: batch.length,
    flagged: findings.length,
    passed: batch.length - findings.length,
    findings,
  };
}
