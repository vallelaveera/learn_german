import type { GrammarCategory, GrammarTier, VerifiedLevel } from "./verified-curriculum";
import { CATEGORY_LABELS, getCategoryBlock, getTierItems } from "./verified-curriculum";
import { TIER_LABELS } from "./coverage";
import { getGrammarPoint } from "./curriculum";
import { GRAMMAR_SOURCE_INTEGRITY } from "@/lib/content/source-integrity";

export const GRAMMAR_ENRICHMENT_SYSTEM = `You are a German grammar curriculum editor for CallMeDaily, a CEFR-aligned learning app.

${GRAMMAR_SOURCE_INTEGRITY}

AUTHORIZED SOURCES (mental checklist — do not cite URLs, but match their style):
- Goethe-Institut Übungsmaterial for the stated level
- telc / ÖSD Prüfungsvorbereitung grammar drills
- Standard Lehrbuch exercise formats (Schritte, Netzwerk, Menschen, Aspekte)
- Duden Rechtschreibung for spelling; standard Hochdeutsch grammar references

PRACTICE GOAL — SENTENCE VARIETY (this is why we enrich):
- Each exercise must use a DIFFERENT German sentence, verb, noun, or everyday context
- Prefer FILL-BLANK, MULTIPLE-CHOICE, and SENTENCE-BUILD with full sentences over repetitive FLASHCARD pairs
- Vary subjects, objects, places, and time expressions while staying inside the tier theory scope
- Do NOT reuse sentence stems from the exclude list — even with a different blank or answer
- Basic tier: short, clear sentences; core patterns only — like Anfänger Lehrbuch drills
- Advanced tier: nuance from advanced theory — typical mistakes, exceptions, register — still level-appropriate

Exercise spec format (exact — one string per exercise):
- FLASHCARD: 'der Mann' → 'the man'
- FILL-BLANK: 'Ich sehe ___ Mann.' → 'den'
- MULTIPLE-CHOICE: 'Ich bin ___ Arzt.' → 'Arzt' (options: ein Arzt, Arzt, der Arzt)
- SENTENCE-BUILD: 'Ich sehe den Hund.' → [Ich / sehe / den / Hund]

Rules:
- Use single quotes around German/English fragments as shown.
- FILL-BLANK: one blank marked with ___; answer is the missing word or phrase only.
- MULTIPLE-CHOICE: exactly one correct option; distractors must be plausible learner mistakes from the typical-mistakes list when provided.
- SENTENCE-BUILD: tokens separated by / inside [ ].
- Mix exercise types when generating more than one item.
- If you cannot tie an exercise to a listed theory bullet, skip it — do not fill gaps with invented grammar.

Output ONLY a JSON array of exercise spec strings. No markdown, no commentary.`;

export function buildGrammarEnrichmentUserPrompt(params: {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  count: number;
  existingExercises: string[];
}): string {
  const block = getCategoryBlock(params.level, params.category);
  const theoryItems = getTierItems(params.level, params.category, params.tier);
  const otherTier = params.tier === "basic" ? "advanced" : "basic";
  const otherTheory = getTierItems(params.level, params.category, otherTier);

  const curriculumPoints =
    block.appCoverage.curriculumIds
      ?.map(id => {
        const p = getGrammarPoint(id);
        return p ? `- ${p.id}: ${p.title} — ${p.explanation}` : null;
      })
      .filter(Boolean)
      .join("\n") ?? "(none linked)";

  const excludeList =
    params.existingExercises.length > 0
      ? params.existingExercises.map(e => `- ${e}`).join("\n")
      : "(none yet)";

  return `Generate ${params.count} NEW practice exercises for the ${TIER_LABELS[params.tier]} tier.

Level: ${params.level}
Category: ${CATEGORY_LABELS[params.category]} (${params.category})
Tier: ${TIER_LABELS[params.tier]} — generate ONLY for this tier's theory below
Trainer status: ${block.appCoverage.status}${block.appCoverage.trainerId ? ` · trainer ${block.appCoverage.trainerId}` : ""}

Theory for ${TIER_LABELS[params.tier]} (ONLY use these rules — do not use ${TIER_LABELS[otherTier]} topics):
${theoryItems.length ? theoryItems.map(b => `- ${b}`).join("\n") : "(no theory bullets yet)"}

Do NOT use ${TIER_LABELS[otherTier]} theory in these exercises:
${otherTheory.map(b => `- ${b}`).join("\n")}

Typical learner mistakes (use for distractors / contrast sentences):
${block.typicalMistakes.map(m => `- ${m}`).join("\n")}

Linked curriculum points (stay within this scope):
${curriculumPoints}

Already present for ${TIER_LABELS[params.tier]} — do NOT duplicate sentences or stems:
${excludeList}

Each exercise must read like a drill from a real ${params.level} grammar workbook covering ${TIER_LABELS[params.tier]} only.
Generate ${params.count} varied sentence-based exercises strictly aligned with ${TIER_LABELS[params.tier]} theory only.
If a theory bullet has no standard exercise you can verify, skip it rather than inventing.`;
}
