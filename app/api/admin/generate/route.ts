import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { runGenerationPipeline } from "@/lib/content/pipeline";
import { runWordGenerationPipeline } from "@/lib/content/pipeline-words";
import type { CEFRLevel, VocabCategory } from "@/lib/vocab/types";
import { CATEGORY_TOPICS, VOCAB_CATEGORIES } from "./topics";

export const runtime = "nodejs";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function isAdmin(req: NextRequest): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  const user = verifyToken(token);
  return user?.email?.toLowerCase() === adminEmail.toLowerCase();
}

function isCEFRLevel(value: string): value is CEFRLevel {
  return (CEFR_LEVELS as string[]).includes(value);
}

function isVocabCategory(value: string): value is VocabCategory {
  return (VOCAB_CATEGORIES as string[]).includes(value);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = VOCAB_CATEGORIES.map(id => ({
    id,
    topics: CATEGORY_TOPICS[id],
  }));

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const level = body.level as string;
    const category = body.category as string;
    const topic = body.topic as string | undefined;
    const count = typeof body.count === "number" ? body.count : 20;
    const type = body.type === "words" ? "words" : "sentences";

    if (!level || !isCEFRLevel(level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }
    if (!category || !isVocabCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (count < 1 || count > 50) {
      return NextResponse.json({ error: "count must be between 1 and 50" }, { status: 400 });
    }

    const summary =
      type === "words"
        ? await runWordGenerationPipeline({ level, category, topic, count })
        : await runGenerationPipeline({ level, category, topic, count });

    return NextResponse.json({ ...summary, type });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
