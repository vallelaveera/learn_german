import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { auditSavedWords } from "@/lib/content/audit-words";
import { isDeepLConfigured, probeDeepLWrite, getDeepLAuditLabel } from "@/lib/content/deepl-client";
import { loadCorpusWords } from "@/lib/vocab/load";
import type { CEFRLevel } from "@/lib/vocab/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const available = isDeepLConfigured();
  const writeEnabled = available ? await probeDeepLWrite() : false;

  return NextResponse.json({
    available,
    provider: available ? "deepl" : null,
    writeEnabled,
    providerLabel: available ? getDeepLAuditLabel(writeEnabled) : null,
    hint: available
      ? undefined
      : "Set DEEPL_AUTH_KEY in Vercel. DeepL Write (grammar/article) requires API Pro; Translate works on Free.",
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const limit = typeof body.limit === "number" ? body.limit : 20;
    const level = body.level as string | undefined;

    if (level && !CEFR_LEVELS.includes(level as CEFRLevel)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    const corpus = await loadCorpusWords();
    let words = corpus.filter(w => w.source === "generated");
    if (level) words = words.filter(w => w.level === level);

    if (words.length === 0) {
      return NextResponse.json({ error: "No generated words to audit" }, { status: 400 });
    }

    const summary = await auditSavedWords(words, { limit });
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
