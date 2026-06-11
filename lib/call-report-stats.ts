import { Message } from "./types";

const STOPWORDS = new Set([
  "dass", "eine", "einen", "einem", "einer", "nicht", "auch", "noch", "oder", "aber",
  "dein", "mein", "sein", "haben", "waren", "wird", "sind", "hast", "habe", "kann",
  "wenn", "dann", "mehr", "sehr", "sich", "wäre", "hallo", "schön", "gerne", "immer",
  "etwas", "heute", "jetzt", "ihre", "beim", "nach", "über", "doch", "hier", "dort",
  "wann", "weil", "denn", "dich", "mich", "ihn", "ihr", "wie", "was", "wer", "nur",
  "mal", "aus", "mit", "von", "zum", "zur", "das", "die", "der", "ein", "und", "ist",
  "hat", "bin", "war", "ich", "sie", "wir", "man", "dem", "den",
]);

export function computeCallReportStats(messages: Message[], durationSec: number) {
  const userMessages = messages.filter(m => m.role === "user");
  const userTurns = userMessages.length;
  const corrections = userMessages.filter(m => m.correction).length;
  const grammarScore = userTurns > 0 ? Math.round(((userTurns - corrections) / userTurns) * 100) : 100;

  const mayaText = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ");
  const userText = userMessages.map(m => m.content.toLowerCase()).join(" ");
  const userWordSet = new Set((userText.match(/\b[a-zäöüß]{3,}\b/g) ?? []).map(w => w.toLowerCase()));
  const mayaWords = Array.from(new Set(mayaText.match(/\b[a-zA-ZäöüÄÖÜß]{4,20}\b/g) ?? []))
    .filter(w => /^[a-zA-ZäöüÄÖÜß]+$/.test(w))
    .filter(w => !STOPWORDS.has(w.toLowerCase()))
    .filter(w => !userWordSet.has(w.toLowerCase()))
    .slice(0, 15);

  const fmtDuration = `${String(Math.floor(durationSec / 60)).padStart(2, "0")}:${String(durationSec % 60).padStart(2, "0")}`;

  return {
    durationSec,
    durationLabel: fmtDuration,
    sentenceCount: userTurns,
    grammarScore,
    newWords: mayaWords,
  };
}
