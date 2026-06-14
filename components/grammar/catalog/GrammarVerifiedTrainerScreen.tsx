"use client";

import { GrammarCatalogScreen } from "./GrammarCatalogScreen";
import { GrammarExerciseSession } from "./GrammarExerciseSession";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import { useGrammarLevelExercises } from "@/hooks/useGrammarExercises";
import {
  getCategoryBlock,
  getTierItems,
  CATEGORY_LABELS,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";

interface GrammarVerifiedTrainerScreenProps {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier?: GrammarTier;
  title: string;
  subtitle?: string;
}

export function GrammarVerifiedTrainerScreen({
  level,
  category,
  tier = "basic",
  title,
  subtitle,
}: GrammarVerifiedTrainerScreenProps) {
  const block = getCategoryBlock(level, category);
  const { getExercises, exerciseCounts } = useGrammarLevelExercises(level);
  const exercises = getExercises(category, tier);
  const color = levelColor(level);
  const light = levelLightColor(level);
  const items = getTierItems(level, category, tier);
  const { markExerciseDone, markTrainerVisited } = useGrammarCatalogProgress(level, exerciseCounts);

  return (
    <GrammarCatalogScreen
      level={level}
      category={category}
      tier={tier}
      title={title}
      subtitle={subtitle}
      theoryItems={items}
      typicalMistakes={block.typicalMistakes}
      exerciseCount={exercises.length}
    >
      <GrammarExerciseSession
        exercises={exercises}
        levelColor={color}
        levelLightColor={light}
        sessionReport={{
          type: "grammar",
          category,
          title: `${level} · ${CATEGORY_LABELS[category]} (${tier === "basic" ? "Basis" : "Fortgeschritten"})`,
        }}
        onExerciseDone={idx => markExerciseDone(category, tier, idx)}
        onSessionStart={() => markTrainerVisited(category, tier)}
      />
    </GrammarCatalogScreen>
  );
}
