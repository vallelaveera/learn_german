"use client";

import { GrammarCatalogScreen } from "./GrammarCatalogScreen";
import { GrammarExerciseSession } from "./GrammarExerciseSession";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import {
  getCategoryBlock,
  getTierItems,
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
  const color = levelColor(level);
  const light = levelLightColor(level);
  const items = getTierItems(level, category, tier);
  const { markExerciseDone, markTrainerVisited } = useGrammarCatalogProgress(level);

  return (
    <GrammarCatalogScreen
      level={level}
      category={category}
      tier={tier}
      title={title}
      subtitle={subtitle}
      theoryItems={items}
      typicalMistakes={block.typicalMistakes}
    >
      <GrammarExerciseSession
        exercises={block.exercises}
        levelColor={color}
        levelLightColor={light}
        onExerciseDone={idx => markExerciseDone(category, tier, idx)}
        onSessionStart={() => markTrainerVisited(category, tier)}
      />
    </GrammarCatalogScreen>
  );
}
