export interface SentenceEntry {
  id: string;
  german: string;
  english: string;
  level: string;
  illustrationCategory?: string;
}

export interface SentenceExercise {
  id: string;
  german: string;
  english: string;
  level: string;
  words: string[];
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

export function shuffleWords(words: string[]): { id: string; word: string }[] {
  return shuffle(words.map((word, i) => ({ id: `${word}-${i}`, word })));
}
