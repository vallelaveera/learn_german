import type { CallCorrection } from "@/lib/corrections";
import { isSatzbauEligible } from "@/lib/corrections";
import type { SentenceExercise } from "./sentences";
import { shuffleWords, tokenizeSentence } from "./sentences";

export function correctionsToExercises(corrections: CallCorrection[]): SentenceExercise[] {
  return corrections
    .filter(c => isSatzbauEligible(c.correct))
    .map(c => ({
      id: c.id,
      german: c.correct,
      english: c.note?.trim() || "Korrigierter Satz aus deinem Anruf",
      level: "Anruf",
      words: tokenizeSentence(c.correct),
    }));
}

export function buildCallSentenceExercises(corrections: CallCorrection[]) {
  return correctionsToExercises(corrections).map(s => ({
    ...s,
    chips: shuffleWords(s.words),
    said: corrections.find(c => c.id === s.id)?.said,
    note: corrections.find(c => c.id === s.id)?.note,
  }));
}
