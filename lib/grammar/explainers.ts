import type { GrammarLevelId } from "./curriculum";

export const GRAMMAR_EXPLAINER_COLLAPSED_KEY = "grammar_explainer_collapsed";

export interface GrammarExplainerExample {
  de: string;
  en?: string;
  note?: string;
}

export interface GrammarExplainerTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface GrammarExplainerSection {
  icon?: string;
  heading: string;
  body: string;
  examples?: GrammarExplainerExample[];
  commonMistake?: string;
  caseTable?: GrammarExplainerTable;
  conjugationTable?: GrammarExplainerTable;
  passiveTable?: GrammarExplainerTable;
  [key: string]: unknown;
}

export interface GrammarLevelExplainerPage {
  level: GrammarLevelId;
  title: string;
  subtitle: string;
  readingTime?: string;
  readingTimeMinutes?: number;
  sections: GrammarExplainerSection[];
  keyTakeaway: string;
  callContext: string;
}

export interface GrammarExplainersFile {
  meta?: {
    version?: number;
    title?: string;
    description?: string;
  };
  pages: GrammarLevelExplainerPage[];
}

const TABLE_KEY = /Table$/;

export function getExplainerReadingTime(page: GrammarLevelExplainerPage): string {
  if (page.readingTime?.trim()) return page.readingTime.trim();
  if (page.readingTimeMinutes != null) return `${page.readingTimeMinutes} Min.`;
  return "5 Min.";
}

export function getSectionTables(
  section: GrammarExplainerSection,
): { key: string; table: GrammarExplainerTable }[] {
  return Object.entries(section)
    .filter(([key, value]) => TABLE_KEY.test(key) && isGrammarTable(value))
    .map(([key, value]) => ({ key, table: value as GrammarExplainerTable }));
}

function isGrammarTable(value: unknown): value is GrammarExplainerTable {
  if (!value || typeof value !== "object") return false;
  const table = value as GrammarExplainerTable;
  return Array.isArray(table.headers) && Array.isArray(table.rows);
}

export function formatTableLabel(key: string): string {
  const labels: Record<string, string> = {
    caseTable: "Kasus",
    conjugationTable: "Konjugation",
    passiveTable: "Passiv",
  };
  if (labels[key]) return labels[key];
  return key
    .replace(/Table$/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

export function getExplainerForLevel(
  data: GrammarExplainersFile | null | undefined,
  levelId: GrammarLevelId,
): GrammarLevelExplainerPage | null {
  if (!data?.pages?.length) return null;
  return data.pages.find(page => page.level === levelId) ?? null;
}

export function readExplainerCollapsedMap(): Partial<Record<GrammarLevelId, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GRAMMAR_EXPLAINER_COLLAPSED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<GrammarLevelId, boolean>>;
  } catch {
    return {};
  }
}

/** First visit: expanded. After user collapses once for a level, stay collapsed. */
export function isExplainerCollapsed(levelId: GrammarLevelId): boolean {
  return readExplainerCollapsedMap()[levelId] === true;
}

export function setExplainerCollapsed(levelId: GrammarLevelId, collapsed: boolean): void {
  if (typeof window === "undefined") return;
  const map = readExplainerCollapsedMap();
  map[levelId] = collapsed;
  localStorage.setItem(GRAMMAR_EXPLAINER_COLLAPSED_KEY, JSON.stringify(map));
}

export async function loadGrammarExplainers(): Promise<GrammarExplainersFile | null> {
  try {
    const res = await fetch("/data/german_grammar_explainers.json", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as GrammarExplainersFile;
  } catch {
    return null;
  }
}
