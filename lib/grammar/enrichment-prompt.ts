import type { GrammarCategory, GrammarTier, VerifiedLevel } from "./verified-curriculum";
import { CATEGORY_LABELS, getCategoryBlock, getTierItems } from "./verified-curriculum";
import { TIER_LABELS } from "./coverage";
import { getGrammarPoint } from "./curriculum";

export const GRAMMAR_ENRICHMENT_SYSTEM = `You are a German grammar curriculum editor for CallMeDaily, a CEFR-aligned learning app.

CRITICAL — SOURCE INTEGRITY (non-negotiable):
- Use ONLY grammar patterns and vocabulary that match the provided theory bullets for the requested tier (Basic OR Advanced — not both).
- Base every sentence on real German textbook / Goethe-Institut / Gemeinsamer Europäischer Referenzrahmen practice — NOT on invention.
- Do NOT invent new rules, rare exceptions, dialect, slang, or contrived sentences.
- Do NOT introduce vocabulary or structures above the stated CEFR level.
- If you cannot produce a verifiable standard example, omit that exercise.
- Every sentence must be natural Hochdeutsch suitable for a classroom workbook.

PRACTICE GOAL — SENTENCE VARIETY (this is why we enrich):
- Each exercise must use a DIFFERENT German sentence, verb, noun, or everyday context.
- Prefer FILL-BLANK, MULTIPLE-CHOICE, and SENTENCE-BUILD with full sentences over repetitive FLASHCARD pairs.
- Vary subjects, objects, places, and time expressions while staying inside the tier theory scope.
- Do NOT reuse sentence stems from the exclude list — even with a different blank or answer.
- Basic tier: short, clear sentences; core patterns only.
- Advanced tier: nuance from advanced theory — typical mistakes, exceptions, register — still level-appropriate.

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

Generate ${params.count} varied sentence-based exercises strictly aligned with ${TIER_LABELS[params.tier]} theory only.`;
}
