"use client";

import { Phone, ChevronDown } from "lucide-react";
import type { GrammarLevelId } from "@/lib/grammar/curriculum";
import {
  formatTableLabel,
  getExplainerReadingTime,
  getSectionTables,
  type GrammarExplainerSection,
  type GrammarExplainerTable,
  type GrammarLevelExplainerPage,
} from "@/lib/grammar/explainers";

const SECTION_ICON_EMOJI: Record<string, string> = {
  article: "📌",
  articles: "📌",
  pronoun: "👤",
  pronouns: "👤",
  verb: "⚡",
  verbs: "⚡",
  "verb-sein": "✓",
  "verb-haben": "✓",
  "word-order": "↕",
  negation: "✗",
  questions: "❓",
  tense: "🕐",
  case: "📋",
  cases: "📋",
  preposition: "📍",
  prepositions: "📍",
  passive: "↺",
  konjunktiv: "💭",
  register: "🎭",
  default: "📖",
};

function sectionIcon(icon?: string): string {
  if (!icon) return SECTION_ICON_EMOJI.default;
  const key = icon.toLowerCase().replace(/\s+/g, "-");
  return SECTION_ICON_EMOJI[key] ?? SECTION_ICON_EMOJI.default;
}

function GrammarTableBlock({ table, label }: { table: GrammarExplainerTable; label: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: "0 0 8px",
        }}
      >
        {table.caption ?? label}
      </p>
      <div
        style={{
          overflowX: "auto",
          borderRadius: 8,
          border: "0.5px solid var(--border-light)",
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <thead>
            <tr>
              {table.headers.map(header => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    fontWeight: 700,
                    color: "var(--text)",
                    background: "var(--bg-warm)",
                    borderBottom: "0.5px solid var(--border-light)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "8px 10px",
                      color: "var(--text)",
                      borderBottom:
                        rowIndex < table.rows.length - 1 ? "0.5px solid var(--border-light)" : undefined,
                      verticalAlign: "top",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExplainerSectionBlock({
  section,
  levelColor,
  levelLightColor,
}: {
  section: GrammarExplainerSection;
  levelColor: string;
  levelLightColor: string;
}) {
  const tables = getSectionTables(section);

  return (
    <section
      style={{
        padding: "14px 14px 12px",
        borderRadius: 12,
        background: "#fff",
        border: "0.5px solid var(--border-light)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: levelLightColor,
            color: levelColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {sectionIcon(section.icon)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="ui-title-serif" style={{ fontSize: 16, margin: "0 0 8px", lineHeight: 1.3 }}>
            {section.heading}
          </h3>
          <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.55, margin: 0, whiteSpace: "pre-line" }}>
            {section.body}
          </p>
        </div>
      </div>

      {section.examples && section.examples.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {section.examples.map((example, index) => (
            <div
              key={index}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: levelLightColor,
                border: `0.5px solid ${levelColor}22`,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--text)",
                  margin: "0 0 4px",
                  lineHeight: 1.45,
                }}
              >
                {example.de}
              </p>
              {example.en && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>
                  {example.en}
                </p>
              )}
              {example.note && (
                <p style={{ fontSize: 11, color: levelColor, margin: "6px 0 0", fontWeight: 600 }}>
                  {example.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tables.map(({ key, table }) => (
        <GrammarTableBlock key={key} table={table} label={formatTableLabel(key)} />
      ))}

      {section.commonMistake && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#FFF5F5",
            border: "0.5px solid #FEB2B2",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#C53030",
              margin: "0 0 4px",
            }}
          >
            Häufiger Fehler
          </p>
          <p style={{ fontSize: 13, color: "#742A2A", margin: 0, lineHeight: 1.5 }}>
            {section.commonMistake}
          </p>
        </div>
      )}
    </section>
  );
}

export interface GrammarLevelExplainerProps {
  explainer: GrammarLevelExplainerPage;
  levelId: GrammarLevelId;
  levelColor: string;
  levelLightColor: string;
  onCollapse: () => void;
  onPracticeWithMaya: () => void;
}

export function GrammarLevelExplainer({
  explainer,
  levelId,
  levelColor,
  levelLightColor,
  onCollapse,
  onPracticeWithMaya,
}: GrammarLevelExplainerProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        marginBottom: 20,
        padding: "16px 14px 14px",
        borderRadius: 16,
        background: "linear-gradient(180deg, var(--bg-warm) 0%, #fff 48%)",
        border: `1px solid ${levelLightColor}`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            background: levelLightColor,
            color: levelColor,
          }}
        >
          {levelId}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 999,
            background: "#fff",
            color: "var(--text-muted)",
            border: "0.5px solid var(--border-light)",
          }}
        >
          {getExplainerReadingTime(explainer)} Lesezeit
        </span>
      </div>

      <h2 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 6px", lineHeight: 1.25 }}>
        {explainer.title}
      </h2>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
        {explainer.subtitle}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: "min(52vh, 420px)",
          overflowY: "auto",
          paddingRight: 2,
          marginBottom: 14,
        }}
      >
        {explainer.sections.map((section, index) => (
          <ExplainerSectionBlock
            key={`${section.heading}-${index}`}
            section={section}
            levelColor={levelColor}
            levelLightColor={levelLightColor}
          />
        ))}
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: levelLightColor,
          border: `0.5px solid ${levelColor}33`,
          marginBottom: 14,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: levelColor,
            margin: "0 0 6px",
          }}
        >
          Das Wichtigste
        </p>
        <p style={{ fontSize: 14, color: "var(--text)", margin: 0, lineHeight: 1.55 }}>
          {explainer.keyTakeaway}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={onPracticeWithMaya}
          className="ui-btn-primary"
          style={{ width: "100%", minHeight: 48, justifyContent: "center", gap: 8 }}
        >
          <Phone size={18} />
          Jetzt mit Maya üben
        </button>
        <button
          type="button"
          onClick={onCollapse}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 12,
            border: "0.5px solid var(--border-light)",
            background: "#fff",
            color: "var(--text-muted)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          Verstanden — zeig mir die Übungen
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}

/** Compact bar when explainer is collapsed for this level. */
export function GrammarExplainerCollapsedBar({
  title,
  levelColor,
  onExpand,
}: {
  title: string;
  levelColor: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      style={{
        width: "100%",
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 12,
        border: "0.5px solid var(--border-light)",
        background: "#fff",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span style={{ display: "block", fontSize: 11, color: levelColor, fontWeight: 700, marginBottom: 2 }}>
        Einführung
      </span>
      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
        {title} — Erklärung anzeigen
      </span>
    </button>
  );
}
