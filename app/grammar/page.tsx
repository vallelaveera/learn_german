"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Table2, Sparkles, Hammer, Clock } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GrammarDetailSheet } from "@/components/grammar/GrammarDetailSheet";
import { GrammarHighlightedSentence } from "@/components/grammar/GrammarHighlightedSentence";
import {
  GrammarExplainerCollapsedBar,
  GrammarLevelExplainer,
} from "@/components/grammar/GrammarLevelExplainer";
import {
  defaultGrammarLevelId,
  getGrammarLevel,
  GRAMMAR_CALL_STORAGE_KEY,
  GRAMMAR_LEVEL_IDS,
  practiceTypeLabel,
  visiblePracticeTypes,
  type GrammarLevelId,
  type GrammarPoint,
} from "@/lib/grammar/curriculum";
import {
  getExplainerForLevel,
  isExplainerCollapsed,
  loadGrammarExplainers,
  setExplainerCollapsed,
  type GrammarExplainersFile,
} from "@/lib/grammar/explainers";
import { getGrammarFlashcardsHref, splitGrammarExampleSentences } from "@/lib/grammar/highlight";
import {
  getArticleTrainerHref,
  getDefaultArticleTrainerPointForLevel,
  isArticleTrainerPoint,
  supportsArticlePicker,
} from "@/lib/articles/scope";

export default function GrammarPage() {
  const router = useRouter();
  const [levelId, setLevelId] = useState<GrammarLevelId>("A1");
  const [levelReady, setLevelReady] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<GrammarPoint | null>(null);
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
          setLevelId(defaultGrammarLevelId(data.user.germanLevel));
        }
      })
      .finally(() => setLevelReady(true));

    void loadGrammarExplainers().then(setExplainers);
  }, [router]);

  useEffect(() => {
    setExplainerCollapsedState(isExplainerCollapsed(levelId));
  }, [levelId]);

  const level = getGrammarLevel(levelId);
  const points = useMemo(() => level?.points ?? [], [level]);
  const explainer = useMemo(
    () => getExplainerForLevel(explainers, levelId),
    [explainers, levelId],
  );
  const articleTablePointId = useMemo(
    () => getDefaultArticleTrainerPointForLevel(levelId),
    [levelId],
  );
  const articleTableHref = articleTablePointId
    ? getArticleTrainerHref(articleTablePointId, levelId)
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
            Wähle dein Level — tippe ein Thema für Erklärung und Übung.
          </p>
          {level && (
            <p style={{ fontSize: 12, color: level.color, margin: 0, fontWeight: 600 }}>
              {level.label}
              {!levelReady ? " · lädt..." : ""}
            </p>
          )}
        </div>

        <SegmentedTabs
          tabs={GRAMMAR_LEVEL_IDS.map(id => ({ id, label: id }))}
          value={levelId}
          onChange={setLevelId}
        />

        {articleTableHref && level && (
          <Link
            href={articleTableHref}
            className="ui-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              marginBottom: 10,
              marginTop: 4,
              textDecoration: "none",
              border: `1px solid ${level.color}44`,
              background: level.lightColor,
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#fff",
                color: level.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Table2 size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: level.color,
                  marginBottom: 2,
                }}
              >
                Artikel-Tabelle
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                {levelId === "A1"
                  ? "der · die · das — Nominativ"
                  : levelId === "A2"
                    ? "Nom · Akk · Dat — interaktive Übersicht"
                    : "Alle Fälle inkl. Genitiv — interaktive Übersicht"}
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: level.color, flexShrink: 0 }}>
              Öffnen →
            </span>
          </Link>
        )}

        <Link
          href="/grammar/gender"
          className="ui-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            marginBottom: 10,
            marginTop: articleTableHref ? 0 : 4,
            border: "1px solid rgba(60, 52, 137, 0.28)",
            background: "rgba(60, 52, 137, 0.08)",
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#fff",
              color: "#3C3489",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                color: "#3C3489",
                marginBottom: 2,
              }}
            >
              DER DIE DAS Üben
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Merksätze · Lücken füllen · Artikel sortieren
            </span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#3C3489", flexShrink: 0 }}>
            Öffnen →
          </span>
        </Link>

        <Link
          href="/grammar/tenses"
          className="ui-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            marginBottom: ["B1", "B2", "C1", "C2"].includes(levelId) ? 10 : 16,
            textDecoration: "none",
            border: "1px solid rgba(107, 79, 160, 0.28)",
            background: "rgba(107, 79, 160, 0.08)",
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#fff",
              color: "#6B4FA0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Clock size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                color: "#6B4FA0",
                marginBottom: 2,
              }}
            >
              Zeiten verstehen
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Zeitstraße · 6 Zeitformen · Verbklammer
            </span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B4FA0", flexShrink: 0 }}>
            Üben →
          </span>
        </Link>

        {(["B1", "B2", "C1", "C2"] as const).includes(levelId as "B1" | "B2" | "C1" | "C2") && (
          <Link
            href="/grammar/cases"
            className="ui-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              marginBottom: 16,
              textDecoration: "none",
              border: "1px solid rgba(8, 80, 65, 0.28)",
              background: "rgba(8, 80, 65, 0.08)",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#fff",
                color: "#085041",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Hammer size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#085041",
                  marginBottom: 2,
                }}
              >
                Fälle meistern
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                Nom · Akk · Dat · Gen · Präpositionen
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#085041", flexShrink: 0 }}>
              Üben →
            </span>
          </Link>
        )}

        {explainer && level && !explainerCollapsed && (
          <GrammarLevelExplainer
            explainer={explainer}
            levelId={levelId}
            levelColor={level.color}
            levelLightColor={level.lightColor}
            onCollapse={collapseExplainer}
            onPracticeWithMaya={practiceExplainerWithMaya}
          />
        )}

        {explainer && level && explainerCollapsed && (
          <GrammarExplainerCollapsedBar
            title={explainer.title}
            levelColor={level.color}
            onExpand={expandExplainer}
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
          }}
        >
          {points.map(point => {
            const tableHref =
              supportsArticlePicker(point.id) && isArticleTrainerPoint(point.id)
                ? getArticleTrainerHref(point.id)
                : null;

            return (
            <div
              key={point.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPoint(point)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedPoint(point);
                }
              }}
              className="ui-card"
              style={{
                textAlign: "left",
                padding: "16px 16px 14px",
                border: `1px solid ${level?.lightColor ?? "var(--border-light)"}`,
                background: "#fff",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div>
                  <h3 className="ui-title-serif" style={{ fontSize: 17, margin: "0 0 4px", lineHeight: 1.3 }}>
                    {point.title}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {point.subtitle}
                  </p>
                </div>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: level?.lightColor ?? "var(--accent-soft)",
                    color: level?.color ?? "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={16} />
                </span>
              </div>

              <div style={{ margin: "0 0 12px" }}>
                <GrammarHighlightedSentence
                  sentence={splitGrammarExampleSentences(point.example.de, point.example.en)[0]?.de ?? point.example.de}
                  subtitle={point.subtitle}
                  size="sm"
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {tableHref && (
                  <Link
                    href={tableHref}
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: level?.lightColor ?? "var(--accent-soft)",
                      color: level?.color ?? "var(--accent)",
                      border: `1px solid ${level?.color ?? "var(--accent)"}55`,
                      textDecoration: "none",
                    }}
                  >
                    Tabelle
                  </Link>
                )}
                {visiblePracticeTypes(point.practiceTypes).slice(0, 4).map(type => {
                  if (type === "flashcard") {
                    return (
                      <Link
                        key={type}
                        href={getGrammarFlashcardsHref(point.id, levelId)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "5px 10px",
                          borderRadius: 999,
                          background: level?.lightColor ?? "var(--accent-soft)",
                          color: level?.color ?? "var(--accent)",
                          border: `1px solid ${level?.color ?? "var(--accent)"}55`,
                          textDecoration: "none",
                        }}
                      >
                        {practiceTypeLabel(type)}
                      </Link>
                    );
                  }
                  return (
                  <span
                    key={type}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "var(--bg-warm)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {practiceTypeLabel(type)}
                  </span>
                  );
                })}
                {visiblePracticeTypes(point.practiceTypes).length > 4 && (
                  <span style={{ fontSize: 10, color: "var(--text-dim)", alignSelf: "center" }}>
                    +{visiblePracticeTypes(point.practiceTypes).length - 4}
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {points.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 24 }}>
            Keine Grammatikpunkte für dieses Level.
          </p>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/mode" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            ← Zurück zur Startseite
          </Link>
        </div>
      </div>

      {selectedPoint && level && (
        <GrammarDetailSheet
          point={selectedPoint}
          level={level}
          onClose={() => setSelectedPoint(null)}
        />
      )}
    </PageShell>
  );
}
