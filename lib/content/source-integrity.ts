import type { CEFRLevel } from "@/lib/vocab/types";

/** Shared non-negotiable rules for corpus generation (words + sentences). */
export function buildCorpusSourceIntegrityBlock(level: CEFRLevel): string {
  return `CRITICAL — SOURCE INTEGRITY (non-negotiable):
- Use ONLY vocabulary and sentence patterns found in standard German teaching materials: Goethe-Institut, telc, ÖSD, Duden spelling norms, and mainstream CEFR coursebooks (e.g. Schritte international, Netzwerk, Menschen, Aspekte).
- Every item must plausibly appear in an official ${level} workbook, Goethe/telc prep list, or classroom handout — NOT invented for this app.
- Do NOT invent rare words, niche idioms, dialect (Bayern, Schwäbisch, etc.), youth slang, or artificial example sentences.
- Do NOT guess article gender or conjugation — if unsure, omit the item entirely.
- Do NOT use brand names, celebrity names, product names, or political/controversial topics.
- Hochdeutsch only — natural spoken register appropriate to ${level}.
- Prefer high-frequency, textbook-verified vocabulary over creative synonyms.`;
}

export const GRAMMAR_SOURCE_INTEGRITY = `CRITICAL — SOURCE INTEGRITY (non-negotiable):
- Use ONLY grammar patterns documented in Goethe-Institut / telc / Gemeinsamer Europäischer Referenzrahmen (GER) materials for the stated level.
- Base every exercise on real German textbook drills, Goethe Übungssätze, or standard Lehrbuch patterns — NOT on invention.
- Do NOT invent new rules, rare exceptions, dialect forms, slang, or contrived sentences.
- Do NOT introduce vocabulary or structures above the stated CEFR level.
- If you cannot produce a verifiable standard example from known teaching practice, omit that exercise.
- Every sentence must be natural Hochdeutsch suitable for a classroom workbook or official exam prep.`;
