import sentencesData from "@/data/flashcards/sentences.json";
import { getExerciseExcludedKeys } from "@/lib/kv";
import { loadCorpusSentences } from "@/lib/vocab/load";
import { BATCH_SENTENCES } from "@/lib/content/sentences-batch";
import {
  batchCategoryMatchesExercise,
  inferBatchCategoryFromGerman,
  normalizeGerman,
} from "@/lib/content/illustration-lookup";
import { isExerciseEntryExcluded } from "./exclusion";
import { isLevelAppropriate } from "./levels";
import { matchesSentenceCategory, type SentenceExerciseCategory } from "./categories";
import { getScenario, matchesScenario } from "./scenarios";
import { prioritizeWithVisuals } from "./prioritize";
import { hasSentenceIllustration } from "./visual-assets";
import type { UserProfile } from "@/lib/types";
import {
  tokenizeSentence,
  type SentenceEntry,
  type SentenceExercise,
} from "./sentences";

const staticBank = sentencesData as SentenceEntry[];

function entryMatchesCategory(
  entry: SentenceEntry,
  category: SentenceExerciseCategory,
): boolean {
  if (category === "call") return false;
  if (entry.illustrationCategory) {
    return batchCategoryMatchesExercise(entry.illustrationCategory, category);
  }
  return matchesSentenceCategory(entry.german, category);
}

async function getSentenceBank(): Promise<SentenceEntry[]> {
  const corpus = await loadCorpusSentences();
  const seen = new Set<string>();

  const staticEntries: SentenceEntry[] = staticBank.map(e => {
    seen.add(normalizeGerman(e.german));
    return {
      ...e,
      illustrationCategory: inferBatchCategoryFromGerman(e.german) ?? undefined,
    };
  });

  const batchEntries = BATCH_SENTENCES.flatMap(s => {
    const key = normalizeGerman(s.de);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      id: s.id,
      german: s.de,
      english: s.en,
      level: s.level,
      illustrationCategory: s.category,
    }];
  });

  const generated = corpus
    .filter(s => !seen.has(normalizeGerman(s.de)))
    .map(s => ({
      id: s.id,
      german: s.de,
      english: s.en,
      level: s.level,
      illustrationCategory: inferBatchCategoryFromGerman(s.de) ?? undefined,
    }));

  return [...staticEntries, ...batchEntries, ...generated];
}

export async function selectSentenceExercises(
  userId: string,
  profile: UserProfile,
  limit = 5,
  category: SentenceExerciseCategory = "everyday",
  scenarioId?: string | null,
): Promise<SentenceExercise[]> {
  const userLevel = profile.germanLevel ?? profile.facts.germanLevel ?? "A2";
  const excluded = await getExerciseExcludedKeys(userId, "sentence");
  const bank = await getSentenceBank();

  let pool = bank.filter(
    e =>
      isLevelAppropriate(e.level, userLevel) &&
      !isExerciseEntryExcluded(e.id, e.german, excluded) &&
      entryMatchesCategory(e, category),
  );

  const scenario = getScenario(scenarioId);
  if (scenario) {
    const matching = pool.filter(e => matchesScenario(e.german, scenario));
    const rest = pool.filter(e => !matching.some(m => m.id === e.id));
    pool = [...matching, ...rest];
  }

  const ranked = await prioritizeWithVisuals(pool, e =>
    hasSentenceIllustration(e.id, e.german),
  );

  return ranked.slice(0, limit).map(e => ({
    id: e.id,
    german: e.german,
    english: e.english,
    level: e.level,
    words: tokenizeSentence(e.german),
  }));
}
