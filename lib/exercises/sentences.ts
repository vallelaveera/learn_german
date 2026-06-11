import sentencesData from "@/data/flashcards/sentences.json";
import { getExerciseExcludedKeys } from "@/lib/kv";
import { loadCorpusSentences } from "@/lib/vocab/load";
import { isExerciseEntryExcluded } from "./exclusion";
import { isLevelAppropriate } from "./levels";
import { matchesSentenceCategory, type SentenceExerciseCategory } from "./categories";
import type { UserProfile } from "@/lib/types";

export interface SentenceEntry {
  id: string;
  german: string;
  english: string;
  level: string;
}

export interface SentenceExercise {
  id: string;
  german: string;
  english: string;
  level: string;
  words: string[];
}

const staticBank = sentencesData as SentenceEntry[];

async function getSentenceBank(): Promise<SentenceEntry[]> {
  const corpus = await loadCorpusSentences();
  const seen = new Set(staticBank.map(e => e.german.toLowerCase().trim()));
  const generated = corpus
    .filter(s => !seen.has(s.de.toLowerCase().trim()))
    .map(s => ({
      id: s.id,
      german: s.de,
      english: s.en,
      level: s.level,
    }));
  return [...staticBank, ...generated];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function tokenizeSentence(german: string): string[] {
  return german
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.replace(/^[„"«']|[»"'"]$/g, "").replace(/[.,!?;:]+$/, ""));
}

export async function selectSentenceExercises(
  userId: string,
  profile: UserProfile,
  limit = 5,
  category: SentenceExerciseCategory = "everyday",
): Promise<SentenceExercise[]> {
  const userLevel = profile.germanLevel ?? profile.facts.germanLevel ?? "A2";
  const excluded = await getExerciseExcludedKeys(userId, "sentence");
  const bank = await getSentenceBank();

  let pool = bank.filter(
    e =>
      isLevelAppropriate(e.level, userLevel) &&
      !isExerciseEntryExcluded(e.id, e.german, excluded) &&
      matchesSentenceCategory(e.german, category)
  );

  if (pool.length < limit) {
    const fallback = bank.filter(
      e =>
        isLevelAppropriate(e.level, userLevel) &&
        !isExerciseEntryExcluded(e.id, e.german, excluded)
    );
    pool = [...pool, ...fallback.filter(e => !pool.some(p => p.id === e.id))];
  }

  return shuffle(pool)
    .slice(0, limit)
    .map(e => ({
      id: e.id,
      german: e.german,
      english: e.english,
      level: e.level,
      words: tokenizeSentence(e.german),
    }));
}

export function shuffleWords(words: string[]): { id: string; word: string }[] {
  return shuffle(words.map((word, i) => ({ id: `${word}-${i}`, word })));
}
