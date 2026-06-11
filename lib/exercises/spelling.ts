import { getVocab } from "@/lib/kv";
import type { UserProfile } from "@/lib/types";
import { getCareerVocabEntries } from "@/lib/career-vocab/load";
import type { SpellingItem } from "./types";

export function normalizeSpelling(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s\-]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

export function spellingMatches(answer: string, input: string): boolean {
  const a = normalizeSpelling(answer);
  const b = normalizeSpelling(input);
  if (!a || !b) return false;
  if (a === b) return true;
  // Allow spaced letter input: "m u e l l e r"
  const compact = b.replace(/\s/g, "");
  return a === compact;
}

function splitNameParts(name: string): string[] {
  return name.split(/\s+/).filter(p => p.length >= 3);
}

export async function selectSpellingItems(profile: UserProfile, limit = 5): Promise<SpellingItem[]> {
  const items: SpellingItem[] = [];
  const seen = new Set<string>();

  const add = (item: SpellingItem) => {
    const key = normalizeSpelling(item.answer);
    if (!key || seen.has(key) || key.length < 3) return;
    seen.add(key);
    items.push(item);
  };

  for (const part of splitNameParts(profile.name)) {
    add({
      id: `name-${part}`,
      label: part,
      answer: part,
      hint: "Dein Name — wie am Telefon buchstabieren",
      context: "Kundenservice fragt oft nach der Schreibweise.",
    });
  }

  if (profile.facts.city) {
    add({
      id: "city",
      label: profile.facts.city,
      answer: profile.facts.city,
      hint: "Deine Stadt",
      context: "Wo wohnst du?",
    });
  }

  if (profile.facts.job) {
    const jobWord = profile.facts.job.split(/\s+/)[0];
    if (jobWord.length >= 4) {
      add({
        id: "job",
        label: jobWord,
        answer: jobWord,
        hint: "Dein Beruf",
      });
    }
  }

  const careerPool = getCareerVocabEntries()
    .filter(e => ["A1", "A2", "B1"].includes(e.level) && e.text.length <= 18 && !e.text.includes(" "))
    .slice(0, 30);

  for (const entry of careerPool) {
    if (items.length >= limit) break;
    add({
      id: `career-${entry.id}`,
      label: entry.text,
      answer: entry.text,
      hint: entry.english,
      context: "Berufsvokabular",
    });
  }

  const vocab = await getVocab(profile.userId);
  for (const v of vocab.filter(w => !w.usedByUser).slice(0, 10)) {
    if (items.length >= limit) break;
    if (v.word.length < 4 || v.word.length > 16 || v.word.includes(" ")) continue;
    add({
      id: `vocab-${v.word}`,
      label: v.word,
      answer: v.word,
      hint: "Wort aus deinen Gesprächen mit Maya",
    });
  }

  return items.slice(0, limit);
}
