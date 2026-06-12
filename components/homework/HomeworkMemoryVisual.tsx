"use client";

const STAGES = [
  { reps: 1, label: "1×", hint: "Erstes Mal", fill: 0.33 },
  { reps: 2, label: "2×", hint: "Wird fester", fill: 0.66 },
  { reps: 3, label: "3×", hint: "Ziel erreicht", fill: 1 },
] as const;

interface HomeworkMemoryVisualProps {
  completedReps: number;
  activeRep: 1 | 2 | 3 | null;
}

export function HomeworkMemoryVisual({ completedReps, activeRep }: HomeworkMemoryVisualProps) {
  const stageIndex = Math.min(2, Math.max(0, completedReps));
  const stage = STAGES[stageIndex];
  const pct = Math.round(stage.fill * 100);
  const goalReached = completedReps >= 3;

  return (
    <div
      className="ui-card ui-card-padded"
      style={{ marginBottom: 20, background: "var(--bg-warm)" }}
    >
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          Sprechen-Score
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 600, color: goalReached ? "var(--green)" : "var(--accent)", lineHeight: 1 }}>
            {Math.min(completedReps, 3)}
          </span>
          <span style={{ fontSize: 18, color: "var(--text-muted)", fontWeight: 500 }}>/ 3</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
          {goalReached
            ? "Satz gemeistert — weiter zum nächsten!"
            : activeRep
              ? `Noch ${3 - completedReps}× sprechen bis der Satz hängen bleibt`
              : "3× pro Satz — so bleibt es im Gedächtnis"}
        </p>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 99,
          background: "rgba(255, 107, 53, 0.12)",
          overflow: "hidden",
          marginBottom: 12,
        }}
        aria-hidden="true"
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: goalReached ? "var(--green)" : "var(--gradient)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }} aria-hidden="true">
        {STAGES.map(s => {
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
              <div style={{ fontSize: 18, marginBottom: 2 }}>{done ? "🧠" : active ? "🎙️" : "○"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: done ? "var(--green)" : active ? "var(--accent)" : "var(--text-muted)" }}>
                {s.label} sprechen
              </div>
              <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.2 }}>
                {s.hint}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
