import { loadTaxonomy, getCategoryIdsForCoverage, getCategoryLabel } from "@/lib/content/taxonomy";
import { loadCorpusSentences, loadCorpusWords } from "@/lib/vocab/load";
import type { CEFRLevel } from "@/lib/vocab/types";

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
  category: string;
  labelDe: string;
  words: number;
  sentences: number;
  total: number;
  byLevel: Record<CEFRLevel, LevelCounts>;
}

export interface CoverageGap {
  category: string;
  labelDe: string;
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
  const [words, sentences, taxonomy] = await Promise.all([
    loadCorpusWords(),
    loadCorpusSentences(),
    loadTaxonomy(),
  ]);

  const corpusCategoryIds = Array.from(
    new Set([...words.map(w => w.category), ...sentences.map(s => s.category)]),
  );
  const categoryMeta = await getCategoryIdsForCoverage(corpusCategoryIds);

  const categories: CategoryCoverage[] = categoryMeta.map(({ id, labelDe }) => ({
    category: id,
    labelDe,
    words: 0,
    sentences: 0,
    total: 0,
    byLevel: emptyByLevel(),
  }));

  const index = new Map(categories.map(c => [c.category, c]));

  for (const w of words) {
    let row = index.get(w.category);
    if (!row) {
      row = {
        category: w.category,
        labelDe: getCategoryLabel(taxonomy, w.category),
        words: 0,
        sentences: 0,
        total: 0,
        byLevel: emptyByLevel(),
      };
      index.set(w.category, row);
      categories.push(row);
    }
    row.words += 1;
    if (row.byLevel[w.level]) row.byLevel[w.level].words += 1;
  }

  for (const s of sentences) {
    let row = index.get(s.category);
    if (!row) {
      row = {
        category: s.category,
        labelDe: getCategoryLabel(taxonomy, s.category),
        words: 0,
        sentences: 0,
        total: 0,
        byLevel: emptyByLevel(),
      };
      index.set(s.category, row);
      categories.push(row);
    }
    row.sentences += 1;
    if (row.byLevel[s.level]) row.byLevel[s.level].sentences += 1;
  }

  for (const row of categories) {
    row.total = row.words + row.sentences;
  }

  categories.sort((a, b) => a.labelDe.localeCompare(b.labelDe));

  const gaps: CoverageGap[] = categories
    .map(row => ({
      category: row.category,
      labelDe: row.labelDe,
      words: row.words,
      sentences: row.sentences,
      total: row.total,
      needsWords: Math.max(0, COVERAGE_TARGETS.words - row.words),
      needsSentences: Math.max(0, COVERAGE_TARGETS.sentences - row.sentences),
    }))
    .filter(g => g.needsWords > 0 || g.needsSentences > 0)
    .sort((a, b) => a.total - b.total);

  return {
    totals: {
      words: words.length,
      sentences: sentences.length,
    },
    targets: COVERAGE_TARGETS,
    categories,
    gaps,
  };
}
