import bankJson from "@/data/career-vocab/german_career_vocab.json";
import type {
  CareerVocabBank,
  CareerVocabCategory,
  CareerVocabCategoryId,
  CareerVocabEntry,
} from "./types";

const CATEGORY_IDS: CareerVocabCategoryId[] = [
  "technical",
  "ai_ml",
  "work_actions",
  "job_profile",
  "benefits",
  "workplace",
  "common_work",
];
const CATEGORY_ID_SET = new Set<string>(CATEGORY_IDS);

function assertBank(raw: CareerVocabBank): CareerVocabBank {
  if (!raw?.meta?.version || !Array.isArray(raw.entries)) {
    throw new Error("career-vocab: invalid german_career_vocab.json — missing meta.version or entries");
  }

  const seen = new Set<string>();
  for (const entry of raw.entries) {
    if (!entry.id || !entry.text || !entry.category) {
      throw new Error(`career-vocab: invalid entry (missing id/text/category)`);
    }
    if (!CATEGORY_ID_SET.has(entry.category)) {
      throw new Error(`career-vocab: unknown category "${entry.category}" on id "${entry.id}"`);
    }
    if (seen.has(entry.id)) {
      throw new Error(`career-vocab: duplicate id "${entry.id}"`);
    }
    seen.add(entry.id);
  }

  return raw;
}

const bank = assertBank(bankJson as CareerVocabBank);

export function getCareerVocabBank(): CareerVocabBank {
  return bank;
}

export function getCareerVocabEntries(): CareerVocabEntry[] {
  return bank.entries;
}

export function getCareerVocabCategories(): CareerVocabCategory[] {
  return bank.categories;
}

export function getCareerVocabEntryById(id: string): CareerVocabEntry | undefined {
  return bank.entries.find(e => e.id === id);
}

export function getCareerVocabEntriesByCategory(
  category: CareerVocabCategoryId
): CareerVocabEntry[] {
  return bank.entries.filter(e => e.category === category);
}

export function getCareerVocabEntriesByIndustry(industry: string): CareerVocabEntry[] {
  const needle = industry.toLowerCase();
  return bank.entries.filter(e =>
    e.industries?.some(i => i.toLowerCase() === needle)
  );
}

/** All matchable surface forms for an entry (canonical + variants). */
export function getCareerVocabMatchForms(entry: CareerVocabEntry): string[] {
  const forms = [entry.text, ...(entry.variants ?? [])];
  return Array.from(new Set(forms.map(f => f.trim()).filter(Boolean)));
}

export function getCareerVocabStats() {
  const byCategory = {} as Record<CareerVocabCategoryId, number>;
  for (let i = 0; i < CATEGORY_IDS.length; i++) byCategory[CATEGORY_IDS[i]] = 0;
  for (const e of bank.entries) byCategory[e.category]++;

  const industries = new Set<string>();
  for (const e of bank.entries) {
    e.industries?.forEach(i => industries.add(i));
  }

  return {
    total: bank.entries.length,
    byCategory,
    industries: Array.from(industries).sort(),
    tracks: bank.meta.tracks ?? [],
    version: bank.meta.version,
    source: bank.meta.source,
  };
}
