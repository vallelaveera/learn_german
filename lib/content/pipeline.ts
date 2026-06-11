import { generateSentences, type GenerateParams } from "./generate";
import { validateSentences } from "./validate";
import { saveSentences } from "@/lib/vocab/save";

export interface PipelineSummary {
  requested: number;
  generated: number;
  passed: number;
  rejected: number;
  rejectionRate: string;
  savedIds: string[];
  rejectedLog: { de: string; issues: string[] }[];
}

export async function runGenerationPipeline(params: GenerateParams): Promise<PipelineSummary> {
  const requested = Math.min(Math.max(params.count, 1), 50);

  const generated = await generateSentences({ ...params, count: requested });
  const { passed, rejected } = await validateSentences(generated);

  const rejectionRate =
    generated.length > 0
      ? `${Math.round((rejected.length / generated.length) * 100)}%`
      : "0%";

  const rejectedLog = rejected.map(r => ({
    de: r.sentence.de,
    issues: r.issues,
  }));

  console.log(
    `[pipeline] done level=${params.level} category=${params.category} topic=${params.topic ?? "none"} generated=${generated.length} passed=${passed.length} rejected=${rejected.length} rate=${rejectionRate}`
  );

  if (rejected.length > 0) {
    console.warn("[pipeline] rejectedLog", JSON.stringify(rejectedLog));
  }

  if (generated.length > 0 && rejected.length / generated.length > 0.3) {
    console.warn("[pipeline] High rejection rate — review prompt or lower count");
  }

  const savedIds = await saveSentences(passed);

  return {
    requested,
    generated: generated.length,
    passed: passed.length,
    rejected: rejected.length,
    rejectionRate,
    savedIds,
    rejectedLog,
  };
}
