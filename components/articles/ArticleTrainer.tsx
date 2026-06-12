"use client";

import { useCallback, useMemo, useState } from "react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getGrammarLevel } from "@/lib/grammar/curriculum";
import type { ArticleTrainerScope, ArticleTrainerTab } from "@/lib/articles/types";
import { ArticleLearnPanel } from "./ArticleLearnPanel";
import { ArticlePracticePanel } from "./ArticlePracticePanel";
import { ArticleQuizPanel } from "./ArticleQuizPanel";
import { ArticleTrainerHUD } from "./ArticleTrainerHUD";

interface ArticleTrainerProps {
  scope: ArticleTrainerScope;
  title: string;
  initialTab?: ArticleTrainerTab;
}

const TABS: { id: ArticleTrainerTab; label: string }[] = [
  { id: "learn", label: "Lernen" },
  { id: "quiz", label: "Quiz" },
  { id: "practice", label: "Üben" },
];

export function ArticleTrainer({ scope, title, initialTab = "learn" }: ArticleTrainerProps) {
  const level = getGrammarLevel(scope.levelId);
  const levelColor = level?.color ?? "var(--accent)";
  const levelLightColor = level?.lightColor ?? "var(--accent-soft)";

  const quizQuestions = useMemo(
    () => scope.quizQuestions,
    [scope.pointId],
  );
  const practiceQuestions = useMemo(
    () => scope.practiceQuestions,
    [scope.pointId],
  );

  const [tab, setTab] = useState<ArticleTrainerTab>(initialTab);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundProgress, setRoundProgress] = useState({ current: 0, total: 0 });

  const handleTabChange = useCallback((next: ArticleTrainerTab) => {
    setTab(next);
    setRoundProgress({ current: 0, total: 0 });
  }, []);

  const handleProgress = useCallback((current: number, total: number) => {
    setRoundProgress({ current, total });
  }, []);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) {
        setScore(s => s + 1);
        setStreak(s => s + 1);
      } else {
        setStreak(0);
      }
    },
    [],
  );

  const showHud = tab === "quiz" || tab === "practice";

  return (
    <ExerciseShell backHref="/grammar" showTabBar={false}>
      <div style={{ padding: "0 18px 18px" }}>
        <ExerciseBackLink href="/grammar" label="← Grammatik" />

        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: levelColor,
              margin: "0 0 6px",
            }}
          >
            {scope.levelId} · Artikel wählen
          </p>
          <h1 className="ui-title-serif" style={{ fontSize: 22, margin: 0, lineHeight: 1.25 }}>
            {title}
          </h1>
        </div>

        <SegmentedTabs tabs={TABS} value={tab} onChange={handleTabChange} />

        {showHud && (
          <ArticleTrainerHUD
            score={score}
            streak={streak}
            progressCurrent={roundProgress.current}
            progressTotal={roundProgress.total}
            accentColor={levelColor}
          />
        )}

        {tab === "learn" && (
          <ArticleLearnPanel
            scopedCases={scope.cases}
            levelColor={levelColor}
            levelLightColor={levelLightColor}
          />
        )}
        {tab === "quiz" && (
          <ArticleQuizPanel
            questions={quizQuestions}
            accentColor={levelColor}
            onAnswer={handleAnswer}
            onProgress={handleProgress}
          />
        )}
        {tab === "practice" && (
          <ArticlePracticePanel
            questions={practiceQuestions}
            accentColor={levelColor}
            accentSoft={levelLightColor}
            onAnswer={handleAnswer}
            onProgress={handleProgress}
          />
        )}
      </div>
    </ExerciseShell>
  );
}
