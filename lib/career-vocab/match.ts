import type { Message } from "@/lib/types";
import type { CareerVocabEntry } from "./types";
import { getCareerVocabEntries, getCareerVocabMatchForms } from "./load";

function foldAscii(text: string): string {
  return text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface MatchForm {
  entryId: string;
  form: string;
  norm: string;
  normAscii: string;
  isPhrase: boolean;
}

let matchIndex: MatchForm[] | null = null;

function buildMatchIndex(entries: CareerVocabEntry[]): MatchForm[] {
  const forms: MatchForm[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const surfaceForms = getCareerVocabMatchForms(entry);
    for (let j = 0; j < surfaceForms.length; j++) {
      const form = surfaceForms[j];
      const norm = normalizeForMatch(form);
      if (!norm) continue;
      forms.push({
        entryId: entry.id,
        form,
        norm,
        normAscii: foldAscii(norm),
        isPhrase: form.indexOf(" ") >= 0 || entry.type === "phrase",
      });
    }
  }
  forms.sort((a, b) => b.norm.length - a.norm.length);
  return forms;
}

function getMatchIndex(): MatchForm[] {
  if (!matchIndex) matchIndex = buildMatchIndex(getCareerVocabEntries());
  return matchIndex;
}

function textIncludesForm(textNorm: string, textAscii: string, form: MatchForm): boolean {
  if (form.isPhrase) {
    return textNorm.indexOf(form.norm) >= 0 || textAscii.indexOf(form.normAscii) >= 0;
  }
  const padded = " " + textNorm + " ";
  const paddedAscii = " " + textAscii + " ";
  return (
    padded.indexOf(" " + form.norm + " ") >= 0 ||
    paddedAscii.indexOf(" " + form.normAscii + " ") >= 0
  );
}

export function matchCareerVocabInText(text: string): string[] {
  if (!text.trim()) return [];
  const textNorm = normalizeForMatch(text);
  const textAscii = foldAscii(textNorm);
  const matched = new Set<string>();
  const index = getMatchIndex();

  for (let i = 0; i < index.length; i++) {
    const form = index[i];
    if (matched.has(form.entryId)) continue;
    if (textIncludesForm(textNorm, textAscii, form)) matched.add(form.entryId);
  }

  return Array.from(matched);
}

export function matchCareerVocabFromMessages(messages: Message[]): {
  userMatched: string[];
  mayaMatched: string[];
} {
  let userText = "";
  let mayaText = "";
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") userText += " " + m.content;
    else mayaText += " " + m.content;
  }
  return {
    userMatched: matchCareerVocabInText(userText),
    mayaMatched: matchCareerVocabInText(mayaText),
  };
}
