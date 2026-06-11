import placementData from "@/data/flashcards/placement.json";
import commonData from "@/data/flashcards/common.json";
import sentencesData from "@/data/flashcards/sentences.json";
import { getCareerVocabEntries } from "@/lib/career-vocab/load";

export interface ContentWord {
  id: string;
  german: string;
  english: string;
  level: string;
  source: "placement" | "common" | "career";
}

export interface ContentSentence {
  id: string;
  german: string;
  english: string;
  level: string;
}

export interface ContentCatalog {
  words: ContentWord[];
  sentences: ContentSentence[];
  counts: {
    words: { total: number; placement: number; common: number; career: number; byLevel: Record<string, number> };
    sentences: { total: number; byLevel: Record<string, number> };
  };
}

type PlacementDeck = Record<string, { id: string; german: string; english: string; level?: string }[]>;

function countByLevel<T extends { level: string }>(items: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    out[item.level] = (out[item.level] ?? 0) + 1;
  }
  return out;
}

export function getExerciseContentCatalog(): ContentCatalog {
  const placementDeck = placementData as PlacementDeck;
  const words: ContentWord[] = [];
  const seen = new Set<string>();

  const addWord = (entry: Omit<ContentWord, "source"> & { source: ContentWord["source"] }) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    words.push(entry);
  };

  for (const level of Object.keys(placementDeck)) {
    for (const entry of placementDeck[level]) {
      addWord({
        id: entry.id,
        german: entry.german,
        english: entry.english,
        level: entry.level ?? level,
        source: "placement",
      });
    }
  }

  for (const entry of commonData as { id: string; german: string; english: string; level: string }[]) {
    addWord({
      id: entry.id,
      german: entry.german,
      english: entry.english,
      level: entry.level,
      source: "common",
    });
  }

  for (const entry of getCareerVocabEntries()) {
    addWord({
      id: entry.id,
      german: entry.text,
      english: entry.english,
      level: entry.level,
      source: "career",
    });
  }

  words.sort((a, b) => a.level.localeCompare(b.level) || a.german.localeCompare(b.german, "de"));

  const sentences = (sentencesData as ContentSentence[]).slice().sort(
    (a, b) => a.level.localeCompare(b.level) || a.german.localeCompare(b.german, "de")
  );

  const placementCount = words.filter(w => w.source === "placement").length;
  const commonCount = words.filter(w => w.source === "common").length;
  const careerCount = words.filter(w => w.source === "career").length;

  return {
    words,
    sentences,
    counts: {
      words: {
        total: words.length,
        placement: placementCount,
        common: commonCount,
        career: careerCount,
        byLevel: countByLevel(words),
      },
      sentences: {
        total: sentences.length,
        byLevel: countByLevel(sentences),
      },
    },
  };
}
