import type { ExerciseMeta } from "./verified-example-types";

const metaBySpec = new Map<string, ExerciseMeta>();

export function registerExerciseMeta(spec: string, meta: ExerciseMeta): void {
  metaBySpec.set(spec.trim(), meta);
}

export function getExerciseMeta(spec: string): ExerciseMeta | undefined {
  return metaBySpec.get(spec.trim());
}

export function clearExerciseMetaRegistry(): void {
  metaBySpec.clear();
}

export function exerciseMetaRegistrySize(): number {
  return metaBySpec.size;
}
