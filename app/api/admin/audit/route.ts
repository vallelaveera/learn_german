import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { auditSavedWords } from "@/lib/content/audit-words";
import { getAvailableAuditProvider, type AuditProvider } from "@/lib/content/llm-providers";
import { loadCorpusWords } from "@/lib/vocab/load";
import type { CEFRLevel } from "@/lib/vocab/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getAvailableAuditProvider();
  return NextResponse.json({
    available: !!provider,
    provider,
    hint: provider
      ? undefined
      : "Set GEMINI_API_KEY (recommended) or OPENAI_API_KEY in Vercel env. DeepL is not suitable for grammar/article audits.",
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const limit = typeof body.limit === "number" ? body.limit : 20;
    const level = body.level as string | undefined;
    const provider = body.provider as AuditProvider | undefined;

    if (level && !CEFR_LEVELS.includes(level as CEFRLevel)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    const corpus = await loadCorpusWords();
    let words = corpus.filter(w => w.source === "generated");
    if (level) words = words.filter(w => w.level === level);

    if (words.length === 0) {
      return NextResponse.json({ error: "No generated words to audit" }, { status: 400 });
    }

    const summary = await auditSavedWords(words, { limit, provider });
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
