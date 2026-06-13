import type { BatchSentence } from "./sentences-batch";
import {
  extractSvg,
  finalizeIllustrationSvg,
  ILLUSTRATION_MODEL,
  ILLUSTRATION_SYSTEM_PROMPT,
} from "./sentence-illustrations";

export function wordIllustrationStorageId(entryId: string): string {
  return entryId.startsWith("word-") ? entryId : `word-${entryId}`;
}

export function buildWordIllustrationUserPrompt(word: BatchSentence): string {
  return `Create an animated scene illustrating this German vocabulary item:
German: ${word.de}
English: ${word.en}
Level: ${word.level}
Category: ${word.category}

Show a clear visual metaphor for the word's meaning. Maya can interact with or point at the concept.
Keep the scene simple and focused on one idea. Add a simple looping animation.`;
}

export async function generateWordIllustrationSvg(word: BatchSentence): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ILLUSTRATION_MODEL,
      max_tokens: 2000,
      system: ILLUSTRATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildWordIllustrationUserPrompt(word) }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? "").trim();
  const svg = extractSvg(raw);
  return finalizeIllustrationSvg(svg);
}
