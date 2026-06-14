"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarCatalogScreen } from "@/components/grammar/catalog/GrammarCatalogScreen";
import { GrammarExerciseSession } from "@/components/grammar/catalog/GrammarExerciseSession";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import { useGrammarLevelExercises } from "@/hooks/useGrammarExercises";
import {
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  getCategoryBlock,
  getTierItems,
  CATEGORY_LABELS,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getInteractiveTrainerLink } from "@/lib/grammar/trainer-routes";

function LearnPageInner() {
  const searchParams = useSearchParams();
  const levelParam = searchParams.get("level") as VerifiedLevel | null;
  const categoryParam = searchParams.get("category") as GrammarCategory | null;
  const tierParam = (searchParams.get("tier") as GrammarTier | null) ?? "basic";

  const level: VerifiedLevel =
    levelParam && VERIFIED_LEVELS.includes(levelParam) ? levelParam : "A1";
  const category: GrammarCategory =
    categoryParam && GRAMMAR_CATEGORIES.includes(categoryParam) ? categoryParam : "cases";
  const tier: GrammarTier = tierParam === "advanced" ? "advanced" : "basic";

  const block = getCategoryBlock(level, category);
  const { getExercises, exerciseCounts } = useGrammarLevelExercises(level);
  const exercises = getExercises(category, tier);
  const color = levelColor(level);
  const light = levelLightColor(level);
  const items = getTierItems(level, category, tier);
  const interactiveTrainer = getInteractiveTrainerLink(level, category, tier);
  const progress = useGrammarCatalogProgress(level, exerciseCounts);

  return (
    <GrammarCatalogScreen
      level={level}
      category={category}
      tier={tier}
      coverageNote={block.appCoverage.notes ?? block.appCoverage.status}
      theoryItems={items}
      typicalMistakes={block.typicalMistakes}
      interactiveTrainer={interactiveTrainer}
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
        onExerciseDone={idx => progress.markExerciseDone(category, tier, idx)}
        onSessionStart={() => progress.markTrainerVisited(category, tier)}
      />
    </GrammarCatalogScreen>
  );
}

export default function GrammarLearnPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
          Lädt…
        </div>
      }
    >
      <LearnPageInner />
    </Suspense>
  );
}
