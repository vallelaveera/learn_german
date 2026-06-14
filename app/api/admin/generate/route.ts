import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { runGenerationPipeline } from "@/lib/content/pipeline";
import { runWordGenerationPipeline } from "@/lib/content/pipeline-words";
import type { AdminLlmProvider } from "@/lib/content/llm-provider";
import {
  getActiveCategory,
  loadTaxonomy,
  resolveTopicForGeneration,
  toActiveCategoryViews,
} from "@/lib/content/taxonomy";
import { getCorpusCoverageReport } from "@/lib/content/coverage";
import {
  ADMIN_LLM_PROVIDERS,
  getAvailableProviders,
  parseAdminProvider,
  providerLabel,
} from "@/lib/content/llm-provider";
import type { CEFRLevel } from "@/lib/vocab/types";

export const runtime = "nodejs";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function isCEFRLevel(value: string): value is CEFRLevel {
  return (CEFR_LEVELS as string[]).includes(value);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await loadTaxonomy();
  const categories = toActiveCategoryViews(doc);
  const coverage = await getCorpusCoverageReport();
  const availableProviders = getAvailableProviders();
  const providerOptions = ADMIN_LLM_PROVIDERS.filter(p => availableProviders.includes(p.id)).map(p => ({
    id: p.id,
    label: p.label,
  }));

  return NextResponse.json({
    categories,
    coverage,
    taxonomyUpdatedAt: doc.updatedAt,
    providers: providerOptions,
    defaultProvider: availableProviders[0] ?? "claude",
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const level = body.level as string;
    const category = body.category as string;
    const topic = body.topic as string | undefined;
    const count = typeof body.count === "number" ? body.count : 50;
    const type = body.type === "words" ? "words" : "sentences";
    const provider = parseAdminProvider(body.provider);
    const available = getAvailableProviders();
    if (!available.includes(provider)) {
      return NextResponse.json(
        { error: `${providerLabel(provider)} is not configured on this deployment` },
        { status: 400 },
      );
    }

    if (!level || !isCEFRLevel(level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (count < 1 || count > 50) {
      return NextResponse.json({ error: "count must be between 1 and 50" }, { status: 400 });
    }

    const doc = await loadTaxonomy();
    if (!getActiveCategory(doc, category)) {
      return NextResponse.json({ error: "Invalid or inactive category" }, { status: 400 });
    }

    const topicResult = resolveTopicForGeneration(doc, category, topic);
    if (!topicResult.ok) {
      return NextResponse.json({ error: topicResult.error }, { status: 400 });
    }

    const summary =
      type === "words"
        ? await runWordGenerationPipeline({
            level,
            category,
            topic: topicResult.topic,
            count,
            provider,
          })
        : await runGenerationPipeline({
            level,
            category,
            topic: topicResult.topic,
            count,
            provider,
          });

    return NextResponse.json({ ...summary, type, provider, providerLabel: providerLabel(provider) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
