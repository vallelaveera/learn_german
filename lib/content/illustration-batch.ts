import type { BatchSentence } from "./sentences-batch";
import { BATCH_SENTENCES } from "./sentences-batch";
import {
  corpusCategoryMatchesBatch,
  inferBatchCategoryFromGerman,
  ILLUSTRATION_BATCH_LIMIT,
  normalizeGerman,
} from "./illustration-lookup";
import {
  generateIllustrationSvg,
  PLACEHOLDER_ILLUSTRATION_SVG,
} from "./sentence-illustrations";
import {
  getStoredIllustration,
  isPlaceholderIllustration,
  needsRegeneration,
  storeIllustration,
} from "./illustration-storage";
import sentencesData from "@/data/flashcards/sentences.json";
import commonData from "@/data/flashcards/common.json";
import placementData from "@/data/flashcards/placement.json";
import { loadCorpusSentences, loadCorpusWords } from "@/lib/vocab/load";
import { getCareerVocabEntries } from "@/lib/career-vocab/load";
import type { CEFRLevel } from "@/lib/vocab/types";
import type { FlashCardEntry } from "@/lib/exercises/types";
import {
  generateWordIllustrationSvg,
  wordIllustrationStorageId,
} from "./word-illustrations";

export type IllustrationKind = "sentences" | "words";

export type IllustrationStatus = "missing" | "placeholder" | "generated";

export interface CategoryMeta {
  id: string;
  label: string;
}

export const BATCH_CATEGORIES: CategoryMeta[] = [
  { id: "transport", label: "Transport" },
  { id: "food", label: "Food & Drink" },
  { id: "daily_life", label: "Daily Life" },
  { id: "career", label: "Work & Career" },
  { id: "emotions", label: "Emotions & Feelings" },
];

export interface SentenceIllustrationRow {
  id: string;
  de: string;
  en: string;
  level: string;
  category: string;
  status: IllustrationStatus;
  charCount: number;
}

export interface CategoryStats {
  id: string;
  label: string;
  total: number;
  generated: number;
  placeholder: number;
  missing: number;
}

export interface IllustrationBatchResult {
  category: string;
  generated: number;
  skipped: number;
  failed: number;
  total: number;
  limit: number;
  pending: number;
  hasMore: boolean;
  costEstimate: string;
  logs: string[];
}

/** Max Claude generations per API request (avoids Vercel timeouts). */
export { ILLUSTRATION_BATCH_LIMIT } from "./illustration-lookup";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const FLASHCARD_SENTENCES = sentencesData as {
  id: string;
  german: string;
  english: string;
  level: string;
}[];

function dedupeSentences(sentences: BatchSentence[]): BatchSentence[] {
  const seen = new Set<string>();
  const out: BatchSentence[] = [];
  for (const s of sentences) {
    const key = normalizeGerman(s.de);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export async function getSentencesByCategory(category: string): Promise<BatchSentence[]> {
  const batch = BATCH_SENTENCES.filter(s => s.category === category);
  const extras: BatchSentence[] = [];

  for (const fc of FLASHCARD_SENTENCES) {
    const inferred = inferBatchCategoryFromGerman(fc.german);
    if (inferred !== category) continue;
    extras.push({
      id: fc.id,
      de: fc.german,
      en: fc.english,
      level: fc.level as CEFRLevel,
      category,
    });
  }

  try {
    const corpus = await loadCorpusSentences();
    for (const s of corpus) {
      const matches =
        corpusCategoryMatchesBatch(s.category, category) ||
        inferBatchCategoryFromGerman(s.de) === category;
      if (!matches) continue;
      extras.push({
        id: s.id,
        de: s.de,
        en: s.en,
        level: s.level,
        category,
      });
    }
  } catch (err) {
    console.error("Failed to load corpus sentences for illustrations:", err);
  }

  return dedupeSentences([...batch, ...extras]);
}

export async function getSentenceStatus(sentence: BatchSentence): Promise<SentenceIllustrationRow> {
  const stored = await getStoredIllustration(sentence.id);
  let status: IllustrationStatus = "missing";
  let charCount = 0;

  if (stored) {
    charCount = stored.length;
    status = isPlaceholderIllustration(stored) ? "placeholder" : "generated";
  }

  return {
    id: sentence.id,
    de: sentence.de,
    en: sentence.en,
    level: sentence.level,
    category: sentence.category,
    status,
    charCount,
  };
}

export async function getCategoryStats(category: string): Promise<CategoryStats> {
  const meta = BATCH_CATEGORIES.find(c => c.id === category);
  const sentences = await getSentencesByCategory(category);
  const rows = await Promise.all(sentences.map(getSentenceStatus));

  return {
    id: category,
    label: meta?.label ?? category,
    total: rows.length,
    generated: rows.filter(r => r.status === "generated").length,
    placeholder: rows.filter(r => r.status === "placeholder").length,
    missing: rows.filter(r => r.status === "missing").length,
  };
}

export async function getAllCategoryStats(): Promise<CategoryStats[]> {
  return Promise.all(BATCH_CATEGORIES.map(c => getCategoryStats(c.id)));
}

export async function runIllustrationBatchForCategory(
  category: string,
  options: { retryPlaceholders?: boolean; delayMs?: number; limit?: number } = {},
): Promise<IllustrationBatchResult> {
  const delayMs = options.delayMs ?? 500;
  const limit = Math.min(Math.max(options.limit ?? ILLUSTRATION_BATCH_LIMIT, 1), ILLUSTRATION_BATCH_LIMIT);
  const sentences = await getSentencesByCategory(category);
  const logs: string[] = [];
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;

  if (sentences.length === 0) {
    return {
      category,
      generated: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      limit,
      pending: 0,
      hasMore: false,
      costEstimate: "0.000",
      logs: ["No sentences in category"],
    };
  }

  for (let i = 0; i < sentences.length; i++) {
    if (attempted >= limit) {
      logs.push(`BATCH LIMIT: ${limit} per request — run again for the next batch`);
      break;
    }

    const sentence = sentences[i];

    if (options.retryPlaceholders) {
      if (!(await needsRegeneration(sentence.id))) {
        logs.push(`SKIP (ok): ${sentence.id}`);
        skipped++;
        continue;
      }
    } else {
      const stored = await getStoredIllustration(sentence.id);
      if (stored && !isPlaceholderIllustration(stored)) {
        logs.push(`SKIP (cached): ${sentence.id}`);
        skipped++;
        continue;
      }
    }

    attempted++;

    try {
      let svg: string;
      let ok = false;

      try {
        svg = await generateIllustrationSvg(sentence);
        ok = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logs.push(`WARN placeholder: ${sentence.id} — ${msg}`);
        svg = PLACEHOLDER_ILLUSTRATION_SVG;
        failed++;
      }

      await storeIllustration(sentence.id, svg);

      if (ok) {
        generated++;
        logs.push(`DONE: ${sentence.id} (${svg.length} chars)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`ERROR: ${sentence.id} — ${msg}`);
      try {
        await storeIllustration(sentence.id, PLACEHOLDER_ILLUSTRATION_SVG);
      } catch {
        /* ignore */
      }
      failed++;
    }

    if (attempted % 5 === 0 || attempted === limit) {
      logs.push(`Progress: ${attempted}/${limit} this batch · ${i + 1}/${sentences.length} in category`);
    }

    await sleep(delayMs);
  }

  let pending = 0;
  for (const s of sentences) {
    if (await needsRegeneration(s.id)) pending++;
  }

  return {
    category,
    generated,
    skipped,
    failed,
    total: sentences.length,
    limit,
    pending,
    hasMore: pending > 0,
    costEstimate: (generated * 0.003).toFixed(3),
    logs,
  };
}

const FLASHCARD_COMMON = commonData as FlashCardEntry[];
const PLACEMENT_DECK = placementData as Record<string, FlashCardEntry[]>;

/** Vocabulary-style entries only (not full conversational sentences). */
export function isVocabWord(german: string): boolean {
  const t = german.trim();
  if (!t || t.length > 40) return false;
  if (t.includes("?")) return false;
  if (t.split(/\s+/).filter(Boolean).length > 4) return false;
  return true;
}

function wordEntryToBatch(entry: FlashCardEntry, category: string): BatchSentence {
  return {
    id: wordIllustrationStorageId(entry.id),
    de: entry.german,
    en: entry.english,
    level: entry.level as CEFRLevel,
    category,
  };
}

export async function getWordsByCategory(category: string): Promise<BatchSentence[]> {
  const extras: BatchSentence[] = [];

  for (const entry of FLASHCARD_COMMON) {
    if (!isVocabWord(entry.german)) continue;
    const inferred = inferBatchCategoryFromGerman(entry.german);
    if (inferred !== category) continue;
    extras.push(wordEntryToBatch(entry, category));
  }

  for (const level of Object.keys(PLACEMENT_DECK)) {
    for (const entry of PLACEMENT_DECK[level]) {
      if (!isVocabWord(entry.german)) continue;
      const inferred = inferBatchCategoryFromGerman(entry.german);
      if (inferred !== category) continue;
      extras.push(wordEntryToBatch({ ...entry, level }, category));
    }
  }

  for (const entry of getCareerVocabEntries()) {
    const text = entry.text;
    if (!isVocabWord(text)) continue;
    if (category === "career") {
      extras.push({
        id: wordIllustrationStorageId(entry.id),
        de: text,
        en: entry.english,
        level: entry.level,
        category,
      });
    } else if (inferBatchCategoryFromGerman(text) === category) {
      extras.push({
        id: wordIllustrationStorageId(entry.id),
        de: text,
        en: entry.english,
        level: entry.level,
        category,
      });
    }
  }

  try {
    const corpus = await loadCorpusWords();
    for (const w of corpus) {
      if (!isVocabWord(w.de)) continue;
      if (inferBatchCategoryFromGerman(w.de) !== category) continue;
      extras.push({
        id: wordIllustrationStorageId(w.id),
        de: w.de,
        en: w.en,
        level: w.level,
        category,
      });
    }
  } catch (err) {
    console.error("Failed to load corpus words for illustrations:", err);
  }

  return dedupeSentences(extras);
}

export async function getWordCategoryStats(category: string): Promise<CategoryStats> {
  const meta = BATCH_CATEGORIES.find(c => c.id === category);
  const words = await getWordsByCategory(category);
  const rows = await Promise.all(words.map(getSentenceStatus));
  return {
    id: category,
    label: meta?.label ?? category,
    total: rows.length,
    generated: rows.filter(r => r.status === "generated").length,
    placeholder: rows.filter(r => r.status === "placeholder").length,
    missing: rows.filter(r => r.status === "missing").length,
  };
}

export async function getAllWordCategoryStats(): Promise<CategoryStats[]> {
  return Promise.all(BATCH_CATEGORIES.map(c => getWordCategoryStats(c.id)));
}

export async function runWordIllustrationBatchForCategory(
  category: string,
  options: { retryPlaceholders?: boolean; delayMs?: number; limit?: number } = {},
): Promise<IllustrationBatchResult> {
  const delayMs = options.delayMs ?? 500;
  const limit = Math.min(Math.max(options.limit ?? ILLUSTRATION_BATCH_LIMIT, 1), ILLUSTRATION_BATCH_LIMIT);
  const words = await getWordsByCategory(category);
  const logs: string[] = [];
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;

  if (words.length === 0) {
    return {
      category,
      generated: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      limit,
      pending: 0,
      hasMore: false,
      costEstimate: "0.000",
      logs: ["No words in category"],
    };
  }

  for (let i = 0; i < words.length; i++) {
    if (attempted >= limit) {
      logs.push(`BATCH LIMIT: ${limit} per request — run again for the next batch`);
      break;
    }

    const word = words[i];

    if (options.retryPlaceholders) {
      if (!(await needsRegeneration(word.id))) {
        logs.push(`SKIP (ok): ${word.id}`);
        skipped++;
        continue;
      }
    } else {
      const stored = await getStoredIllustration(word.id);
      if (stored && !isPlaceholderIllustration(stored)) {
        logs.push(`SKIP (cached): ${word.id}`);
        skipped++;
        continue;
      }
    }

    attempted++;

    try {
      let svg: string;
      let ok = false;

      try {
        svg = await generateWordIllustrationSvg(word);
        ok = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logs.push(`WARN placeholder: ${word.id} — ${msg}`);
        svg = PLACEHOLDER_ILLUSTRATION_SVG;
        failed++;
      }

      await storeIllustration(word.id, svg);

      if (ok) {
        generated++;
        logs.push(`DONE: ${word.id} (${svg.length} chars)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`ERROR: ${word.id} — ${msg}`);
      try {
        await storeIllustration(word.id, PLACEHOLDER_ILLUSTRATION_SVG);
      } catch {
        /* ignore */
      }
      failed++;
    }

    if (attempted % 5 === 0 || attempted === limit) {
      logs.push(`Progress: ${attempted}/${limit} this batch · ${i + 1}/${words.length} in category`);
    }

    await sleep(delayMs);
  }

  let pending = 0;
  for (const w of words) {
    if (await needsRegeneration(w.id)) pending++;
  }

  return {
    category,
    generated,
    skipped,
    failed,
    total: words.length,
    limit,
    pending,
    hasMore: pending > 0,
    costEstimate: (generated * 0.003).toFixed(3),
    logs,
  };
}
