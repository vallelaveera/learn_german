import { VOCAB_CATEGORIES } from "@/lib/content/topics";
import { loadCorpusSentences, loadCorpusWords } from "@/lib/vocab/load";
import type { CEFRLevel, VocabCategory } from "@/lib/vocab/types";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Suggested minimum generated items per category before it is considered well covered. */
export const COVERAGE_TARGETS = {
  words: 15,
  sentences: 15,
};

export interface LevelCounts {
  words: number;
  sentences: number;
}

export interface CategoryCoverage {
  category: VocabCategory;
  words: number;
  sentences: number;
  total: number;
  byLevel: Record<CEFRLevel, LevelCounts>;
}

export interface CoverageGap {
  category: VocabCategory;
  words: number;
  sentences: number;
  total: number;
  needsWords: number;
  needsSentences: number;
}

export interface CoverageReport {
  totals: { words: number; sentences: number };
  targets: typeof COVERAGE_TARGETS;
  categories: CategoryCoverage[];
  gaps: CoverageGap[];
}

function emptyByLevel(): Record<CEFRLevel, LevelCounts> {
  const out = {} as Record<CEFRLevel, LevelCounts>;
  for (const level of LEVELS) {
    out[level] = { words: 0, sentences: 0 };
  }
  return out;
}

export async function getCorpusCoverageReport(): Promise<CoverageReport> {
  const [words, sentences] = await Promise.all([
    loadCorpusWords(),
    loadCorpusSentences(),
  ]);

  const categories: CategoryCoverage[] = VOCAB_CATEGORIES.map(category => ({
    category,
    words: 0,
    sentences: 0,
    total: 0,
    byLevel: emptyByLevel(),
  }));

  const index = new Map(categories.map(c => [c.category, c]));

  for (const w of words) {
    const row = index.get(w.category);
    if (!row) continue;
    row.words += 1;
    if (row.byLevel[w.level]) row.byLevel[w.level].words += 1;
  }

  for (const s of sentences) {
    const row = index.get(s.category);
    if (!row) continue;
    row.sentences += 1;
    if (row.byLevel[s.level]) row.byLevel[s.level].sentences += 1;
  }

  for (const row of categories) {
    row.total = row.words + row.sentences;
  }

  categories.sort((a, b) => a.total - b.total);

  const gaps: CoverageGap[] = categories
    .map(row => ({
      category: row.category,
      words: row.words,
      sentences: row.sentences,
      total: row.total,
      needsWords: Math.max(0, COVERAGE_TARGETS.words - row.words),
      needsSentences: Math.max(0, COVERAGE_TARGETS.sentences - row.sentences),
    }))
    .filter(g => g.needsWords > 0 || g.needsSentences > 0)
    .sort((a, b) => (b.needsWords + b.needsSentences) - (a.needsWords + a.needsSentences));

  return {
    totals: { words: words.length, sentences: sentences.length },
    targets: COVERAGE_TARGETS,
    categories,
    gaps,
  };
}
