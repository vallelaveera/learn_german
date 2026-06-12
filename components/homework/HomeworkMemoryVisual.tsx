"use client";

const STAGES = [
  { reps: 1, label: "1×", hint: "Erster Kontakt", fill: 0.35 },
  { reps: 2, label: "2×", hint: "Wird fester", fill: 0.72 },
  { reps: 3, label: "3×", hint: "Bleibt hängen", fill: 1 },
] as const;

interface HomeworkMemoryVisualProps {
  completedReps: number;
  activeRep: 1 | 2 | 3 | null;
}

export function HomeworkMemoryVisual({ completedReps, activeRep }: HomeworkMemoryVisualProps) {
  const stageIndex = Math.min(2, Math.max(0, completedReps));
  const stage = STAGES[stageIndex];
  const pct = Math.round(stage.fill * 100);

  return (
    <div
      className="ui-card ui-card-padded"
      style={{ marginBottom: 20, background: "var(--bg-warm)" }}
      aria-hidden="true"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="ui-label">Gedächtnis stärken</span>
        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{pct}%</span>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 99,
          background: "rgba(255, 107, 53, 0.12)",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: "var(--gradient)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        {STAGES.map((s, i) => {
          const done = completedReps >= s.reps;
          const active = activeRep === s.reps;
          return (
            <div
              key={s.reps}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 4px",
                borderRadius: 14,
                border: `2px solid ${active ? "var(--accent)" : done ? "var(--green)" : "var(--border-light)"}`,
                background: active ? "var(--accent-soft)" : done ? "var(--brand-green-soft)" : "var(--surface)",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 2 }}>{done ? "🧠" : active ? "✨" : "○"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: done ? "var(--green)" : active ? "var(--accent)" : "var(--text-muted)" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.2 }}>
                {s.hint}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", margin: "12px 0 0", lineHeight: 1.45 }}>
        3× wiederholen — so bleibt der Satz im Langzeitgedächtnis.
      </p>
    </div>
  );
}
