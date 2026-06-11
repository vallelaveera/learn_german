import type { TaxonomyDoc } from "./taxonomy-types";

/** Default labels for seeded category ids (German UI). */
export const SEED_CATEGORY_LABELS: Record<string, { labelDe: string; labelEn: string }> = {
  career: { labelDe: "Karriere", labelEn: "Career" },
  travel: { labelDe: "Reisen", labelEn: "Travel" },
  food: { labelDe: "Essen", labelEn: "Food" },
  health: { labelDe: "Gesundheit", labelEn: "Health" },
  housing: { labelDe: "Wohnen", labelEn: "Housing" },
  daily_life: { labelDe: "Alltag", labelEn: "Daily life" },
  finance: { labelDe: "Finanzen", labelEn: "Finance" },
  transport: { labelDe: "Transport", labelEn: "Transport" },
  social: { labelDe: "Soziales", labelEn: "Social" },
};

export const SEED_CATEGORY_TOPICS: Record<string, string[]> = {
  career: [
    "job interview",
    "writing a CV",
    "salary negotiation",
    "first day at work",
    "team meeting",
    "giving feedback",
    "asking for a promotion",
    "remote work",
    "job application",
  ],
  travel: [
    "at the airport",
    "booking a hotel",
    "on the train",
    "asking for directions",
    "at customs",
    "car rental",
    "tourist information",
    "lost luggage",
  ],
  food: [
    "at a restaurant",
    "ordering coffee",
    "at the supermarket",
    "cooking at home",
    "dietary requirements",
    "paying the bill",
  ],
  health: [
    "at the doctor",
    "at the pharmacy",
    "describing symptoms",
    "making an appointment",
    "health insurance",
  ],
  housing: [
    "flat viewing",
    "talking to landlord",
    "moving in",
    "utility bills",
    "neighbours",
    "repairs",
  ],
  daily_life: [
    "morning routine",
    "shopping",
    "at the post office",
    "banking",
    "at the gym",
    "making plans with friends",
  ],
  finance: [
    "opening a bank account",
    "paying taxes",
    "health insurance",
    "sending money abroad",
  ],
  transport: [
    "buying a ticket",
    "delayed train",
    "taxi",
    "public transport",
    "driving licence",
  ],
  social: [
    "meeting someone new",
    "small talk at work",
    "inviting someone",
    "apologising",
    "giving compliments",
  ],
};

export function slugifyId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}

export function buildSeedTaxonomy(): TaxonomyDoc {
  const now = Date.now();
  const categories = Object.entries(SEED_CATEGORY_TOPICS).map(([id, topics]) => {
    const labels = SEED_CATEGORY_LABELS[id] ?? { labelDe: id, labelEn: id };
    return {
      id,
      labelDe: labels.labelDe,
      labelEn: labels.labelEn,
      active: true,
      topics: topics.map(label => ({
        id: slugifyId(label),
        label,
        active: true,
      })),
    };
  });

  return { categories, updatedAt: now };
}
