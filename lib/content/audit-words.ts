import { parseJsonArray } from "./generate";
import {
  callAuditLlm,
  getAuditProviderLabel,
  getAvailableAuditProvider,
  type AuditProvider,
} from "./llm-providers";
import type { WordInput } from "@/lib/vocab/types";
import type { SavedWord } from "@/lib/vocab/types";
import {
  issuesReferenceOtherGerman,
  validationResultMatchesWord,
  WORD_VALIDATION_SYSTEM_PROMPT,
  type WordValidationResult,
} from "./word-validation-prompt";

export interface AuditWordFinding {
  id: string;
  de: string;
  en: string;
  level: string;
  issues: string[];
}

export interface AuditWordsSummary {
  provider: AuditProvider;
  providerLabel: string;
  checked: number;
  flagged: number;
  passed: number;
  findings: AuditWordFinding[];
}

const AUDIT_SYSTEM_PROMPT = `${WORD_VALIDATION_SYSTEM_PROMPT}

This is an independent audit of vocabulary already saved in the corpus.
Be especially careful about der/die/das articles and distractor format consistency.`;

function savedWordToInput(word: SavedWord): WordInput {
  return {
    de: word.de,
    en: word.en,
    level: word.level,
    category: word.category,
    topic: word.topic,
    distractors: word.distractors,
  };
}

function parseAuditResults(text: string, word: WordInput): WordValidationResult | null {
  let results = parseJsonArray<WordValidationResult>(text);
  if (!results) {
    try {
      const obj = JSON.parse(text) as { results?: WordValidationResult[] } & WordValidationResult;
      if (Array.isArray(obj.results)) results = obj.results;
      else if (typeof obj.passed === "boolean") results = [obj as WordValidationResult];
    } catch {
      return null;
    }
  }

  const result = results?.find(r => validationResultMatchesWord(r, word.de, 0)) ?? results?.[0];
  if (!result || !validationResultMatchesWord(result, word.de, 0)) return null;
  return result;
}

async function auditSingleWord(
  word: SavedWord,
  provider: AuditProvider,
): Promise<AuditWordFinding | null> {
  const input = savedWordToInput(word);
  const userPrompt = `Audit this ONE saved vocabulary entry. Return a JSON array with exactly one object.\n${JSON.stringify([input])}`;

  try {
    const text = await callAuditLlm(provider, AUDIT_SYSTEM_PROMPT, userPrompt, 1024);
    const result = parseAuditResults(text, input);

    if (!result) {
      return {
        id: word.id,
        de: word.de,
        en: word.en,
        level: word.level,
        issues: ["Audit could not verify this entry — manual review recommended"],
      };
    }

    if (result.passed && result.levelAccurate !== false) return null;

    const issues = [...(result.issues ?? [])];
    if (!result.levelAccurate && !issues.some(i => /level/i.test(i))) {
      issues.push("Level accuracy check failed");
    }
    if (issues.length === 0) issues.push("Marked as failed with no details");

    return { id: word.id, de: word.de, en: word.en, level: word.level, issues };
  } catch (e) {
    console.error(`[audit-words] failed for ${word.de}:`, e);
    return {
      id: word.id,
      de: word.de,
      en: word.en,
      level: word.level,
      issues: ["Audit call failed — manual review recommended"],
    };
  }
}

export async function auditSavedWords(
  words: SavedWord[],
  options: { limit?: number; concurrency?: number; provider?: AuditProvider } = {},
): Promise<AuditWordsSummary> {
  const provider = options.provider ?? getAvailableAuditProvider();
  if (!provider) {
    throw new Error("No audit provider configured — set GEMINI_API_KEY or OPENAI_API_KEY");
  }
  const auditProvider: AuditProvider = provider;

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const concurrency = Math.min(Math.max(options.concurrency ?? 3, 1), 5);
  const batch = words.slice(0, limit);

  const findings: AuditWordFinding[] = [];
  let index = 0;

  async function worker() {
    while (index < batch.length) {
      const i = index++;
      const finding = await auditSingleWord(batch[i], auditProvider);
      if (finding) findings.push(finding);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, () => worker()));

  return {
    provider: auditProvider,
    providerLabel: getAuditProviderLabel(auditProvider),
    checked: batch.length,
    flagged: findings.length,
    passed: batch.length - findings.length,
    findings,
  };
}
