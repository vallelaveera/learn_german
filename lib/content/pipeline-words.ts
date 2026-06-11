import { generateWords } from "./generate-words";
import { validateWords } from "./validate-words";
import { saveWords } from "@/lib/vocab/save";
import type { GenerateParams } from "./generate";
import type { PipelineSummary } from "./pipeline";

export async function runWordGenerationPipeline(params: GenerateParams): Promise<PipelineSummary> {
  const requested = Math.min(Math.max(params.count, 1), 50);

  const generated = await generateWords({ ...params, count: requested });
  const { passed, rejected } = await validateWords(generated);

  const rejectionRate =
    generated.length > 0
      ? `${Math.round((rejected.length / generated.length) * 100)}%`
      : "0%";

  const rejectedLog = rejected.map(r => ({
    de: r.word.de,
    issues: r.issues,
  }));

  console.log(
    `[pipeline-words] done level=${params.level} category=${params.category} topic=${params.topic ?? "none"} generated=${generated.length} passed=${passed.length} rejected=${rejected.length} rate=${rejectionRate}`
  );

  if (rejected.length > 0) {
    console.warn("[pipeline-words] rejectedLog", JSON.stringify(rejectedLog));
  }

  if (generated.length > 0 && rejected.length / generated.length > 0.3) {
    console.warn("[pipeline-words] High rejection rate — review prompt or lower count");
  }

  const savedIds = await saveWords(passed);

  return {
    requested,
    generated: generated.length,
    passed: passed.length,
    rejected: rejected.length,
    rejectionRate,
    savedIds,
    duplicatesSkipped: passed.length - savedIds.length,
    rejectedLog,
  };
}
