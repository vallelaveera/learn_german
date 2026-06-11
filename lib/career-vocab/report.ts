import {
  getCareerVocabBank,
  getCareerVocabCategories,
  getCareerVocabEntries,
  getCareerVocabStats,
} from "./load";
import type {
  CareerVocabCategoryId,
  CareerVocabEntry,
  CareerVocabUserProgress,
} from "./types";

export type CareerVocabEntryStatus = "used" | "exposed" | "unused";

export interface CareerVocabReportEntry {
  id: string;
  text: string;
  english: string;
  type: CareerVocabEntry["type"];
  category: CareerVocabCategoryId;
  level: CareerVocabEntry["level"];
  priority: CareerVocabEntry["priority"];
  industries: string[];
  status: CareerVocabEntryStatus;
  timesUsed: number;
  lastUsedAt?: number;
}

export interface CareerVocabReportCategory {
  id: CareerVocabCategoryId;
  label: string;
  color?: string;
  total: number;
  used: number;
  exposed: number;
  unused: number;
  coveragePct: number;
}

export interface CareerVocabReport {
  meta: ReturnType<typeof getCareerVocabStats> & { source?: string };
  summary: {
    total: number;
    used: number;
    exposedOnly: number;
    unused: number;
    coveragePct: number;
  };
  categories: CareerVocabReportCategory[];
  industries: string[];
  entries: CareerVocabReportEntry[];
}

export interface CareerVocabReportFilters {
  category?: CareerVocabCategoryId;
  industry?: string;
  status?: CareerVocabEntryStatus;
}

function getEntryStatus(
  entryId: string,
  progress: CareerVocabUserProgress | null
): { status: CareerVocabEntryStatus; timesUsed: number; lastUsedAt?: number } {
  const p = progress?.entries?.[entryId];
  if (p?.usedByUser) {
    return { status: "used", timesUsed: p.timesUsed ?? 1, lastUsedAt: p.lastUsedAt };
  }
  if (p?.exposedByMaya) {
    return { status: "exposed", timesUsed: 0, lastUsedAt: undefined };
  }
  return { status: "unused", timesUsed: 0, lastUsedAt: undefined };
}

function entryMatchesIndustry(entry: CareerVocabEntry, industry?: string): boolean {
  if (!industry) return true;
  const needle = industry.toLowerCase();
  return (entry.industries ?? []).some(i => i.toLowerCase() === needle);
}

export function buildCareerVocabReport(
  progress: CareerVocabUserProgress | null,
  filters: CareerVocabReportFilters = {}
): CareerVocabReport {
  const bank = getCareerVocabBank();
  const categories = getCareerVocabCategories();
  const allEntries = getCareerVocabEntries();
  const stats = getCareerVocabStats();

  const reportEntries: CareerVocabReportEntry[] = [];
  const categoryTotals = {} as Record<CareerVocabCategoryId, CareerVocabReportCategory>;

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    categoryTotals[c.id] = {
      id: c.id,
      label: c.label,
      color: (c as { color?: string }).color,
      total: 0,
      used: 0,
      exposed: 0,
      unused: 0,
      coveragePct: 0,
    };
  }

  let used = 0;
  let exposedOnly = 0;
  let unused = 0;

  for (let i = 0; i < allEntries.length; i++) {
    const entry = allEntries[i];
    if (filters.category && entry.category !== filters.category) continue;
    if (!entryMatchesIndustry(entry, filters.industry)) continue;

    const { status, timesUsed, lastUsedAt } = getEntryStatus(entry.id, progress);
    if (filters.status && status !== filters.status) continue;

    const cat = categoryTotals[entry.category];
    cat.total++;
    if (status === "used") {
      cat.used++;
      used++;
    } else if (status === "exposed") {
      cat.exposed++;
      exposedOnly++;
    } else {
      cat.unused++;
      unused++;
    }

    reportEntries.push({
      id: entry.id,
      text: entry.text,
      english: entry.english,
      type: entry.type,
      category: entry.category,
      level: entry.level,
      priority: entry.priority,
      industries: entry.industries ?? [],
      status,
      timesUsed,
      lastUsedAt,
    });
  }

  const categoryList = categories
    .map(c => {
      const row = categoryTotals[c.id];
      row.coveragePct = row.total ? Math.round((row.used / row.total) * 100) : 0;
      return row;
    })
    .filter(c => c.total > 0 || !filters.category);

  const filteredTotal = reportEntries.length;
  const filteredUsed = reportEntries.filter(e => e.status === "used").length;

  return {
    meta: { ...stats, source: bank.meta.source },
    summary: {
      total: filteredTotal,
      used: filteredUsed,
      exposedOnly: reportEntries.filter(e => e.status === "exposed").length,
      unused: reportEntries.filter(e => e.status === "unused").length,
      coveragePct: filteredTotal ? Math.round((filteredUsed / filteredTotal) * 100) : 0,
    },
    categories: categoryList,
    industries: stats.industries.filter(i => i !== "all"),
    entries: reportEntries,
  };
}
