import type { Message } from "./types";

const TOPIC_KEYWORDS: [string, string][] = [
  ["arbeit", "Arbeit & Karriere"],
  ["job", "Arbeit & Karriere"],
  ["karriere", "Arbeit & Karriere"],
  ["bewerb", "Arbeit & Karriere"],
  ["wohn", "Wohnen & Alltag"],
  ["miet", "Wohnen & Alltag"],
  ["einkauf", "Einkaufen & Restaurant"],
  ["restaurant", "Einkaufen & Restaurant"],
  ["essen", "Essen & Kochen"],
  ["koch", "Essen & Kochen"],
  ["reise", "Reisen & Urlaub"],
  ["urlaub", "Reisen & Urlaub"],
  ["familie", "Familie & Freunde"],
  ["freund", "Familie & Freunde"],
  ["sport", "Gesundheit & Sport"],
  ["gesund", "Gesundheit & Sport"],
  ["film", "Filme & Musik"],
  ["musik", "Filme & Musik"],
  ["wetter", "Wetter & Natur"],
  ["technik", "Technik & Internet"],
  ["deutschland", "Deutsche Kultur"],
];

/** Infer a display topic from the conversation (session theme). */
export function inferHomeworkTopic(messages: Message[], askedTopics: string[] = []): string {
  if (askedTopics.length) {
    return askedTopics[askedTopics.length - 1];
  }

  const blob = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  for (const [keyword, label] of TOPIC_KEYWORDS) {
    if (blob.includes(keyword)) return label;
  }

  return "Alltag & Freizeit";
}
