import {
  GRAMMAR_CATEGORIES,
  getBaseTierExercises,
  getCategoryBlock,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "./verified-curriculum";
import { loadExtraExercises } from "./curriculum-kv";
import { getVerifiedExamplesForBlock } from "./verified-examples";

export function mergeExerciseLists(base: string[], extras: string[]): string[] {
  const seen = new Set(base.map(s => s.trim()));
  const merged = [...base];
  for (const spec of extras) {
    const trimmed = spec.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    merged.push(trimmed);
    seen.add(trimmed);
  }
  return merged;
}

function mergeImportedSpecs(base: string[], imported: string[]): string[] {
  return mergeExerciseLists(base, imported);
}

export async function getMergedExercises(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): Promise<{
  exercises: string[];
  baseCount: number;
  extraCount: number;
  importedCount: number;
  tier: GrammarTier;
}> {
  const block = getCategoryBlock(level, category);
  const base = getBaseTierExercises(block, tier);
  const imported = getVerifiedExamplesForBlock(level, category);
  const withImported = mergeImportedSpecs(base, imported);
  const extras = await loadExtraExercises(level, category, tier);
  const exercises = mergeExerciseLists(withImported, extras);
  return {
    exercises,
    baseCount: base.length,
    extraCount: extras.length,
    importedCount: imported.length,
    tier,
  };
}

export async function getMergedLevelExercises(level: VerifiedLevel) {
  const tiers: GrammarTier[] = ["basic", "advanced"];
  const blocks: Record<
    string,
    {
      basic: { exercises: string[]; baseCount: number; extraCount: number };
      advanced: { exercises: string[]; baseCount: number; extraCount: number };
    }
  > = {};

  for (const category of GRAMMAR_CATEGORIES) {
    const [basic, advanced] = await Promise.all([
      getMergedExercises(level, category, "basic"),
      getMergedExercises(level, category, "advanced"),
    ]);
    blocks[category] = {
      basic: {
        exercises: basic.exercises,
        baseCount: basic.baseCount,
        extraCount: basic.extraCount,
      },
      advanced: {
        exercises: advanced.exercises,
        baseCount: advanced.baseCount,
        extraCount: advanced.extraCount,
      },
    };
  }
  return blocks;
}
