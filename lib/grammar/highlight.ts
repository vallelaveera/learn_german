export interface GrammarSentencePair {
  de: string;
  en: string;
}

export interface SentencePart {
  text: string;
  highlight: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse subtitle into searchable focus terms (pronouns, verbs, articles, etc.). */
export function parseGrammarFocusTerms(subtitle: string): string[] {
  const terms = new Set<string>();

  for (const chunk of subtitle.split(/[,/]/)) {
    const part = chunk.trim();
    if (!part || /^\d/.test(part)) continue;

    if (part.includes("+")) {
      for (const piece of part.split("+")) {
        const word = piece.trim();
        if (word.length >= 2 && /^[a-zA-ZäöüÄÖÜß?]+$/i.test(word)) {
          terms.add(word.toLowerCase());
        }
      }
      continue;
    }

    if (/^[a-zA-ZäöüÄÖÜß?]+$/i.test(part)) {
      terms.add(part.toLowerCase());
    }
  }

  return Array.from(terms);
}

export function splitGrammarExampleSentences(de: string, en: string): GrammarSentencePair[] {
  const split = (text: string) =>
    text.match(/[^.!?]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) ?? [text.trim()];

  const deParts = split(de);
  const enParts = split(en);

  return deParts.map((sentenceDe, index) => ({
    de: sentenceDe,
    en: enParts[index] ?? "",
  }));
}

export function buildHighlightedParts(sentence: string, terms: string[]): SentencePart[] {
  if (!sentence) return [];
  if (terms.length === 0) return [{ text: sentence, highlight: false }];

  const pattern = new RegExp(`\\b(${terms.map(escapeRegex).join("|")})\\b`, "gi");
  const parts: SentencePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sentence)) !== null) {
    const index = match.index;
    if (index > lastIndex) {
      parts.push({ text: sentence.slice(lastIndex, index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < sentence.length) {
    parts.push({ text: sentence.slice(lastIndex), highlight: false });
  }

  return parts.length > 0 ? parts : [{ text: sentence, highlight: false }];
}

export function getGrammarFlashcardsHref(pointId: string, levelId?: string): string {
  const params = new URLSearchParams({ point: pointId });
  if (levelId) params.set("level", levelId);
  return `/grammar/flashcards?${params.toString()}`;
}
