"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GrammarCategoryGrid } from "@/components/grammar/catalog/GrammarCategoryGrid";
import { GrammarLevelTOC } from "@/components/grammar/catalog/GrammarLevelTOC";
import {
  GrammarExplainerCollapsedBar,
  GrammarLevelExplainer,
} from "@/components/grammar/GrammarLevelExplainer";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import { useGrammarLevelExercises } from "@/hooks/useGrammarExercises";
import {
  defaultGrammarLevelId,
  getGrammarLevel,
  GRAMMAR_CALL_STORAGE_KEY,
  type GrammarLevelId,
} from "@/lib/grammar/curriculum";
import {
  getExplainerForLevel,
  isExplainerCollapsed,
  loadGrammarExplainers,
  setExplainerCollapsed,
  type GrammarExplainersFile,
} from "@/lib/grammar/explainers";
import { getGrammarFlashcardsHref } from "@/lib/grammar/highlight";
import {
  VERIFIED_LEVELS,
  levelColor,
  levelLightColor,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import {
  getArticleTrainerHref,
  getDefaultArticleTrainerPointForLevel,
} from "@/lib/articles/scope";

function mapToVerifiedLevel(levelId: GrammarLevelId): VerifiedLevel {
  return levelId;
}

export default function GrammarPage() {
  const router = useRouter();
  const [levelId, setLevelId] = useState<VerifiedLevel>("A1");
  const [levelReady, setLevelReady] = useState(false);
  const [explainers, setExplainers] = useState<GrammarExplainersFile | null>(null);
  const [explainerCollapsed, setExplainerCollapsedState] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data?.user?.germanLevel) {
          setLevelId(mapToVerifiedLevel(defaultGrammarLevelId(data.user.germanLevel)));
        }
      })
      .finally(() => setLevelReady(true));

    void loadGrammarExplainers().then(setExplainers);
  }, [router]);

  useEffect(() => {
    setExplainerCollapsedState(isExplainerCollapsed(levelId));
  }, [levelId]);

  const { exerciseCounts, totalExercises } = useGrammarLevelExercises(levelId);
  const progress = useGrammarCatalogProgress(levelId, exerciseCounts);
  const color = levelColor(levelId);
  const light = levelLightColor(levelId);
  const grammarLevel = getGrammarLevel(levelId as GrammarLevelId);
  const explainer = useMemo(
    () => getExplainerForLevel(explainers, levelId as GrammarLevelId),
    [explainers, levelId],
  );
  const flashcardPoint = useMemo(
    () => grammarLevel?.points.find(p => p.practiceTypes.includes("flashcard")),
    [grammarLevel],
  );
  const articleTablePointId = getDefaultArticleTrainerPointForLevel(levelId as GrammarLevelId);
  const articleTableHref = articleTablePointId
    ? getArticleTrainerHref(articleTablePointId, levelId as GrammarLevelId)
    : null;

  const collapseExplainer = useCallback(() => {
    setExplainerCollapsed(levelId, true);
    setExplainerCollapsedState(true);
  }, [levelId]);

  const expandExplainer = useCallback(() => {
    setExplainerCollapsed(levelId, false);
    setExplainerCollapsedState(false);
  }, [levelId]);

  const practiceExplainerWithMaya = useCallback(() => {
    if (!explainer) return;
    sessionStorage.setItem(
      GRAMMAR_CALL_STORAGE_KEY,
      JSON.stringify({
        id: `explainer-${levelId}`,
        level: levelId,
        title: explainer.title,
        prompt: explainer.callContext,
      }),
    );
    sessionStorage.setItem("maya_grammar_focus", `explainer-${levelId}`);
    localStorage.setItem("maya_voice", "soniox");
    router.push(`/call?grammar=${encodeURIComponent(`explainer-${levelId}`)}`);
  }, [explainer, levelId, router]);

  return (
    <PageShell showTabBar title="Grammatik">
      <div className="ui-page" style={{ paddingTop: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <p className="ui-muted" style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.5 }}>
            Wähle Level und Bereich — Basic oder Advanced findest du in jedem Thema.
          </p>
          <p style={{ fontSize: 12, color, margin: 0, fontWeight: 600 }}>
            CEFR {levelId}
            {!levelReady ? " · lädt..." : ""}
          </p>
        </div>

        <SegmentedTabs
          tabs={VERIFIED_LEVELS.map(id => ({ id, label: id }))}
          value={levelId}
          onChange={setLevelId}
        />

        {progress.hydrated && (
          <>
            <GrammarLevelTOC level={levelId} progress={progress} totalExercises={totalExercises} />
            <GrammarCategoryGrid level={levelId} progress={progress} exerciseCounts={exerciseCounts} />
          </>
        )}

        {explainer && grammarLevel && !explainerCollapsed && (
          <GrammarLevelExplainer
            explainer={explainer}
            levelId={levelId as GrammarLevelId}
            levelColor={color}
            levelLightColor={light}
            onCollapse={collapseExplainer}
            onPracticeWithMaya={practiceExplainerWithMaya}
          />
        )}

        {explainer && grammarLevel && explainerCollapsed && (
          <GrammarExplainerCollapsedBar
            title={explainer.title}
            levelColor={color}
            onExpand={expandExplainer}
          />
        )}

        {articleTableHref && (
          <Link
            href={articleTableHref}
            className="ui-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              marginBottom: 10,
              marginTop: explainer ? 10 : 0,
              textDecoration: "none",
              border: `1px solid ${color}44`,
            }}
          >
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color }}>
                Artikel-Tabelle
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                Interaktive Deklination — bestehender Trainer
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>Öffnen →</span>
          </Link>
        )}

        {flashcardPoint && (
          <Link
            href={getGrammarFlashcardsHref(flashcardPoint.id, levelId as GrammarLevelId)}
            className="ui-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              marginBottom: 10,
              textDecoration: "none",
              border: "1px solid var(--border-light)",
            }}
          >
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Karteikarten
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                {flashcardPoint.title} — Classic-Übung
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Üben →</span>
          </Link>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/mode" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            ← Zurück zur Startseite
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
