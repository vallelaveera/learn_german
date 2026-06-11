import { Redis } from "@upstash/redis";
import type { TaxonomyCategory, TaxonomyCategoryView, TaxonomyDoc, TaxonomyTopic } from "./taxonomy-types";
import { buildSeedTaxonomy, slugifyId } from "./taxonomy-seed";

const TAXONOMY_KEY = "corpus:taxonomy";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function parseDoc(raw: unknown): TaxonomyDoc | null {
  if (!raw) return null;
  try {
    const doc = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!doc?.categories || !Array.isArray(doc.categories)) return null;
    return doc as TaxonomyDoc;
  } catch {
    return null;
  }
}

async function saveTaxonomy(doc: TaxonomyDoc): Promise<void> {
  doc.updatedAt = Date.now();
  await redis.set(TAXONOMY_KEY, JSON.stringify(doc));
}

export async function loadTaxonomy(): Promise<TaxonomyDoc> {
  try {
    const raw = await redis.get<string>(TAXONOMY_KEY);
    const parsed = parseDoc(raw);
    if (parsed) return parsed;
  } catch (e) {
    console.error("[taxonomy] load failed:", e);
  }
  const seed = buildSeedTaxonomy();
  await saveTaxonomy(seed);
  return seed;
}

export function toActiveCategoryViews(doc: TaxonomyDoc): TaxonomyCategoryView[] {
  return doc.categories
    .filter(c => c.active)
    .map(c => ({
      id: c.id,
      labelDe: c.labelDe,
      labelEn: c.labelEn,
      topics: c.topics
        .filter(t => t.active)
        .map(t => ({ id: t.id, label: t.label })),
    }));
}

export function getActiveCategory(doc: TaxonomyDoc, categoryId: string): TaxonomyCategory | undefined {
  const cat = doc.categories.find(c => c.id === categoryId);
  if (!cat || !cat.active) return undefined;
  return cat;
}

export function isValidCategoryId(id: string): boolean {
  return /^[a-z][a-z0-9_-]{0,47}$/.test(id);
}

export function normalizeTopicLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

export function resolveTopicForGeneration(
  doc: TaxonomyDoc,
  categoryId: string,
  topic?: string,
): { ok: true; topic?: string } | { ok: false; error: string } {
  if (!topic?.trim()) return { ok: true, topic: undefined };

  const label = normalizeTopicLabel(topic);
  if (label.length > 120) {
    return { ok: false, error: "Topic must be 120 characters or fewer" };
  }

  const cat = getActiveCategory(doc, categoryId);
  if (!cat) return { ok: false, error: "Invalid category" };

  // Preset topic id or label match, or free-text (allowed)
  const preset = cat.topics.find(
    t => t.active && (t.id === label || t.label.toLowerCase() === label.toLowerCase()),
  );
  return { ok: true, topic: preset?.label ?? label };
}

function uniqueTopicId(cat: TaxonomyCategory, label: string): string {
  const base = slugifyId(label);
  let id = base;
  let n = 2;
  while (cat.topics.some(t => t.id === id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function uniqueCategoryId(baseId: string, doc: TaxonomyDoc): string {
  let id = baseId;
  let n = 2;
  while (doc.categories.some(c => c.id === id)) {
    id = `${baseId}-${n}`;
    n += 1;
  }
  return id;
}

export async function addCategory(input: {
  id?: string;
  labelDe: string;
  labelEn?: string;
  topics?: string[];
}): Promise<TaxonomyCategory> {
  const doc = await loadTaxonomy();
  const labelDe = input.labelDe.trim();
  if (!labelDe) throw new Error("labelDe is required");

  const baseId = input.id?.trim() || slugifyId(labelDe);
  if (!isValidCategoryId(baseId)) {
    throw new Error("Category id must be lowercase slug (a-z, 0-9, _, -)");
  }

  const existing = doc.categories.find(c => c.id === baseId);
  if (existing) {
    if (existing.active) throw new Error("Category already exists");
    existing.active = true;
    existing.labelDe = labelDe;
    if (input.labelEn) existing.labelEn = input.labelEn.trim();
    await saveTaxonomy(doc);
    return existing;
  }

  const id = uniqueCategoryId(baseId, doc);
  const topics: TaxonomyTopic[] = (input.topics ?? []).map(label => ({
    id: slugifyId(label),
    label: normalizeTopicLabel(label),
    active: true,
  }));

  const category: TaxonomyCategory = {
    id,
    labelDe,
    labelEn: input.labelEn?.trim() || undefined,
    active: true,
    topics,
  };

  doc.categories.push(category);
  await saveTaxonomy(doc);
  return category;
}

export async function updateCategory(
  categoryId: string,
  patch: { labelDe?: string; labelEn?: string },
): Promise<TaxonomyCategory> {
  const doc = await loadTaxonomy();
  const cat = doc.categories.find(c => c.id === categoryId);
  if (!cat) throw new Error("Category not found");

  if (patch.labelDe !== undefined) {
    const labelDe = patch.labelDe.trim();
    if (!labelDe) throw new Error("labelDe cannot be empty");
    cat.labelDe = labelDe;
  }
  if (patch.labelEn !== undefined) {
    cat.labelEn = patch.labelEn.trim() || undefined;
  }

  await saveTaxonomy(doc);
  return cat;
}

export async function softDeleteCategory(categoryId: string): Promise<void> {
  const doc = await loadTaxonomy();
  const cat = doc.categories.find(c => c.id === categoryId);
  if (!cat) throw new Error("Category not found");
  cat.active = false;
  await saveTaxonomy(doc);
}

export async function addTopic(categoryId: string, label: string): Promise<TaxonomyTopic> {
  const doc = await loadTaxonomy();
  const cat = doc.categories.find(c => c.id === categoryId);
  if (!cat) throw new Error("Category not found");

  const normalized = normalizeTopicLabel(label);
  if (!normalized) throw new Error("Topic label is required");
  if (normalized.length > 120) throw new Error("Topic label too long");

  const existing = cat.topics.find(t => t.label.toLowerCase() === normalized.toLowerCase());
  if (existing) {
    if (!existing.active) {
      existing.active = true;
      existing.label = normalized;
      await saveTaxonomy(doc);
      return existing;
    }
    throw new Error("Topic already exists in this category");
  }

  const topic: TaxonomyTopic = {
    id: uniqueTopicId(cat, normalized),
    label: normalized,
    active: true,
  };
  cat.topics.push(topic);
  await saveTaxonomy(doc);
  return topic;
}

export async function updateTopic(
  categoryId: string,
  topicId: string,
  patch: { label?: string },
): Promise<TaxonomyTopic> {
  const doc = await loadTaxonomy();
  const cat = doc.categories.find(c => c.id === categoryId);
  if (!cat) throw new Error("Category not found");
  const topic = cat.topics.find(t => t.id === topicId);
  if (!topic) throw new Error("Topic not found");

  if (patch.label !== undefined) {
    const normalized = normalizeTopicLabel(patch.label);
    if (!normalized) throw new Error("Topic label cannot be empty");
    if (normalized.length > 120) throw new Error("Topic label too long");
    topic.label = normalized;
  }

  await saveTaxonomy(doc);
  return topic;
}

export async function softDeleteTopic(categoryId: string, topicId: string): Promise<void> {
  const doc = await loadTaxonomy();
  const cat = doc.categories.find(c => c.id === categoryId);
  if (!cat) throw new Error("Category not found");
  const topic = cat.topics.find(t => t.id === topicId);
  if (!topic) throw new Error("Topic not found");
  topic.active = false;
  await saveTaxonomy(doc);
}

/** All category ids for coverage (active + inactive + orphans from corpus). */
export async function getCategoryIdsForCoverage(corpusCategoryIds: string[]): Promise<
  { id: string; labelDe: string }[]
> {
  const doc = await loadTaxonomy();
  const map = new Map<string, string>();

  for (const c of doc.categories) {
    map.set(c.id, c.labelDe);
  }
  for (const id of corpusCategoryIds) {
    if (!map.has(id)) map.set(id, id);
  }

  return Array.from(map.entries()).map(([id, labelDe]) => ({ id, labelDe }));
}

export function getCategoryLabel(doc: TaxonomyDoc, categoryId: string): string {
  return doc.categories.find(c => c.id === categoryId)?.labelDe ?? categoryId;
}
