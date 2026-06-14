"use client";

import {
  levelColor,
} from "@/lib/grammar/verified-curriculum";
import type { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import type { VerifiedLevel } from "@/lib/grammar/verified-curriculum";

interface GrammarLevelTOCProps {
  level: VerifiedLevel;
  progress: ReturnType<typeof useGrammarCatalogProgress>;
}

export function GrammarLevelTOC({ level, progress }: GrammarLevelTOCProps) {
  const color = levelColor(level);
  const { levelProgress } = progress;

  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, color }}>Inhaltsverzeichnis</h2>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          {levelProgress.done}/{levelProgress.total} · {levelProgress.pct}%
        </span>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--border-light)",
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${levelProgress.pct}%`,
            background: color,
            transition: "width 0.25s",
          }}
        />
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
        Basic und Advanced pro Bereich unten wählen.
      </p>
    </section>
  );
}
