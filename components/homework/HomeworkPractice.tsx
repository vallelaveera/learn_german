"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, Play, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { HomeworkRecorder, playBlobUrl } from "@/components/HomeworkRecorder";
import { speakExercisePrompt, unlockExerciseAudio } from "@/lib/exercise-speech";
import { EmptyState } from "@/components/ui/EmptyState";
import { LearningIllustration } from "@/components/illustrations/LearningIllustration";
import { HomeworkMemoryVisual } from "@/components/homework/HomeworkMemoryVisual";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  HomeworkAssignment,
  HomeworkSentence,
  HomeworkRep,
} from "@/lib/types";
import { getHomeworkProgress, type HomeworkSummary } from "@/lib/homework";

interface Progress {
  completedReps: number;
  totalReps: number;
  completedSentences: number;
}

type HomeworkTab = "open" | "done";

function computeProgress(a: HomeworkAssignment): Progress {
  return getHomeworkProgress(a);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function HistoryCard({ assignment }: { assignment: HomeworkAssignment }) {
  const progress = computeProgress(assignment);
  const done = assignment.status === "completed";
  const skipped = assignment.status === "skipped";

  return (
    <div className="ui-card ui-card-padded" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>
            {assignment.topic ?? "Hausaufgaben"}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            {formatDate(assignment.createdAt)} · {assignment.sentences.length} Sätze
          </p>
        </div>
        <span
          style={{
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 10,
            whiteSpace: "nowrap",
            color: done ? "var(--green)" : "var(--text-muted)",
            background: done ? "var(--brand-green-soft)" : "rgba(0,0,0,0.04)",
            border: `0.5px solid ${done ? "rgba(56,161,105,0.35)" : "var(--border)"}`,
          }}
        >
          {done ? "Erledigt ✓" : skipped ? "Übersprungen" : "Offen"}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="ui-progress-track">
          <div
            className="ui-progress-fill"
            style={{ width: `${(progress.completedReps / Math.max(progress.totalReps, 1)) * 100}%` }}
          />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
          {progress.completedReps} / {progress.totalReps} Aufnahmen · {progress.completedSentences} / {assignment.sentences.length} Sätze mit 3×
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {assignment.sentences.map(sentence => (
          <HistorySentenceRow key={sentence.id} sentence={sentence} assignment={assignment} />
        ))}
      </div>
    </div>
  );
}

function HistorySentenceRow({
  sentence,
  assignment,
}: {
  sentence: HomeworkSentence;
  assignment: HomeworkAssignment;
}) {
  const reps: HomeworkRep[] = assignment.progress[sentence.id] ?? [];

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--bg-warm)",
        border: "1px solid var(--border-light)",
      }}
    >
      <p style={{ fontSize: 14, fontFamily: "var(--font-serif)", margin: "0 0 8px", lineHeight: 1.45 }}>
        {sentence.text}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sprechen-Score</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: reps.length >= 3 ? "var(--green)" : "var(--accent)",
          }}
        >
          {Math.min(reps.length, 3)} / 3
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {([1, 2, 3] as const).map(i => {
          const rep = reps.find(r => r.repIndex === i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => rep && playBlobUrl(rep.blobUrl)}
              disabled={!rep}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: `2px solid ${rep ? "var(--green)" : "var(--border)"}`,
                background: rep ? "var(--brand-green-soft)" : "var(--surface)",
                color: rep ? "var(--green)" : "var(--text-dim)",
                cursor: rep ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rep ? <Play size={14} fill="currentColor" /> : i}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OpenHomeworkPractice({
  assignment,
  assignments,
  summary,
  onSelect,
  onReload,
}: {
  assignment: HomeworkAssignment;
  assignments: HomeworkAssignment[];
  summary: HomeworkSummary | null;
  onSelect: (id: string) => void;
  onReload: (completed?: boolean) => void;
}) {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [progress, setProgress] = useState<Progress>(() => computeProgress(assignment));

  useEffect(() => {
    setProgress(computeProgress(assignment));
    setSentenceIdx(0);
  }, [assignment.id]);

  const sentence: HomeworkSentence | undefined = assignment.sentences[sentenceIdx];
  const reps: HomeworkRep[] = sentence && assignment ? (assignment.progress[sentence.id] ?? []) : [];

  const nextRepIndex = (): 1 | 2 | 3 | null => {
    for (const i of [1, 2, 3] as const) {
      if (!reps.some(r => r.repIndex === i)) return i;
    }
    return null;
  };

  const handleRecorded = async (blob: Blob) => {
    if (!assignment || !sentence) return;
    const repIndex = nextRepIndex();
    if (!repIndex) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("homeworkId", assignment.id);
      form.append("sentenceId", sentence.id);
      form.append("repIndex", String(repIndex));

      const res = await fetch("/api/homework/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");

      const updated = data.assignment as HomeworkAssignment;
      if (updated.status === "completed") {
        onReload(true);
      } else {
        setProgress(computeProgress(updated));
        if (reps.length + 1 >= 3 && sentenceIdx < assignment.sentences.length - 1) {
          setTimeout(() => setSentenceIdx(i => i + 1), 600);
        }
        onReload(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const playMaya = async () => {
    if (!sentence) return;
    setTtsLoading(true);
    setError(null);
    try {
      unlockExerciseAudio();
      await speakExercisePrompt(sentence.text, "de");
    } catch {
      setError("TTS fehlgeschlagen");
    } finally {
      setTtsLoading(false);
    }
  };

  const skipCurrent = async () => {
    await fetch("/api/homework", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip", homeworkId: assignment.id }),
    });
    onReload(true);
  };

  const batchLabel = assignments.length > 1
    ? `Set ${assignments.findIndex(a => a.id === assignment.id) + 1} von ${assignments.length}`
    : null;
  const repToDo = nextRepIndex();

  return (
    <div>
      {assignments.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
          {assignments.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 20,
                border: `1px solid ${a.id === assignment.id ? "var(--accent)" : "var(--border)"}`,
                background: a.id === assignment.id ? "var(--accent-soft)" : "var(--surface)",
                color: a.id === assignment.id ? "var(--accent)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Set {i + 1}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          {assignment.topic && (
            <p style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              {assignment.topic}
            </p>
          )}
          {batchLabel && (
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{batchLabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={skipCurrent}
          style={{ fontSize: 11, color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}
        >
          Skip
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Satz {sentenceIdx + 1} / {assignment.sentences.length}
          </span>
          <span style={{ fontSize: 11, color: "var(--accent)" }}>
            {summary?.completedReps ?? progress.completedReps} / {summary?.totalReps ?? progress.totalReps} gesamt
          </span>
        </div>
        <div className="ui-progress-track">
          <div
            className="ui-progress-fill"
            style={{
              width: `${((summary?.completedReps ?? progress.completedReps) / (summary?.totalReps ?? progress.totalReps ?? 15)) * 100}%`,
            }}
          />
        </div>
      </div>

      {sentence && (
        <>
          <HomeworkMemoryVisual
            completedReps={reps.length}
            activeRep={repToDo}
          />
        </>
      )}

      {sentence && (
        <div className="ui-card ui-card-padded" style={{ marginBottom: 24, background: "var(--gradient-soft)" }}>
          <p className="ui-title-serif" style={{ fontSize: 20, lineHeight: 1.5, marginBottom: 12 }}>{sentence.text}</p>
          {sentence.userSaid && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Du sagtest: <em>{sentence.userSaid}</em>
            </p>
          )}
          {sentence.note && (
            <p style={{ fontSize: 12, color: "var(--accent)", fontStyle: "italic" }}>💡 {sentence.note}</p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
        {([1, 2, 3] as const).map(i => {
          const rep = reps.find(r => r.repIndex === i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => rep && playBlobUrl(rep.blobUrl)}
              disabled={!rep}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: `2px solid ${rep ? "var(--green)" : repToDo === i ? "var(--accent)" : "var(--border)"}`,
                background: rep ? "var(--brand-green-soft)" : repToDo === i ? "var(--accent-soft)" : "var(--surface)",
                color: rep ? "var(--green)" : repToDo === i ? "var(--accent)" : "var(--text-muted)",
                fontSize: 14,
                cursor: rep ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: repToDo === i ? "var(--shadow-sm)" : "none",
              }}
            >
              {rep ? <Play size={16} fill="currentColor" /> : i}
            </button>
          );
        })}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        {repToDo
          ? `Aufnahme ${repToDo} von 3 — sprich den Satz laut`
          : "3× geschafft — weiter zum nächsten Satz!"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <HomeworkRecorder onRecorded={handleRecorded} onError={setError} disabled={uploading || !repToDo} />
        <button type="button" onClick={playMaya} disabled={ttsLoading} className="ui-btn-ghost">
          <Volume2 size={16} />
          {ttsLoading ? "..." : "Maya anhören"}
        </button>
      </div>

      {error && <p style={{ textAlign: "center", color: "var(--red)", fontSize: 12, marginTop: 16 }}>{error}</p>}
      {uploading && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>Speichert...</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
        <button
          type="button"
          disabled={sentenceIdx === 0}
          onClick={() => setSentenceIdx(i => i - 1)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", opacity: sentenceIdx === 0 ? 0.4 : 1, cursor: sentenceIdx === 0 ? "not-allowed" : "pointer" }}
        >
          ← Zurück
        </button>
        <button
          type="button"
          disabled={sentenceIdx >= assignment.sentences.length - 1}
          onClick={() => setSentenceIdx(i => i + 1)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", opacity: sentenceIdx >= assignment.sentences.length - 1 ? 0.4 : 1, cursor: sentenceIdx >= assignment.sentences.length - 1 ? "not-allowed" : "pointer" }}
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}

export function HomeworkPractice() {
  const [tab, setTab] = useState<HomeworkTab>("open");
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [history, setHistory] = useState<HomeworkAssignment[]>([]);
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [summary, setSummary] = useState<HomeworkSummary | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const applyOpenData = useCallback((data: {
    enabled?: boolean;
    assignments?: HomeworkAssignment[];
    assignment?: HomeworkAssignment | null;
    summary?: HomeworkSummary | null;
    history?: HomeworkAssignment[];
  }) => {
    setEnabled(data.enabled !== false);
    const list: HomeworkAssignment[] = data.assignments ?? (data.assignment ? [data.assignment] : []);
    setAssignments(list);
    setAssignment(prev => {
      if (prev && list.some(a => a.id === prev.id)) {
        return list.find(a => a.id === prev.id) ?? list[0] ?? null;
      }
      return list[0] ?? null;
    });
    setSummary(data.summary ?? null);
    if (data.history) setHistory(data.history);
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/homework");
      const data = await res.json();
      applyOpenData(data);
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyOpenData]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab === "done") {
      void fetch("/api/homework?filter=completed")
        .then(r => r.json())
        .then(data => setHistory(data.history ?? []))
        .catch(() => {});
    }
  }, [tab]);

  if (loading) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>Lädt...</p>;
  }

  if (!enabled) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 8 }}>Hausaufgaben nicht aktiviert</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Für dein Konto ist Hausaufgaben deaktiviert. Bitte Support kontaktieren.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { id: "open", label: "Offen", icon: <Clock size={16} /> },
          { id: "done", label: "Erledigt", icon: <CheckCircle2 size={16} /> },
        ]}
        value={tab}
        onChange={id => setTab(id as HomeworkTab)}
      />

      {tab === "open" ? (
        !assignment ? (
          <EmptyState
            illustration={<LearningIllustration width={160} height={123} />}
            title="Keine offenen Hausaufgaben"
            description="Ruf Maya an — nach dem Gespräch bekommst du neue Sätze zum Üben."
            actionLabel="Mit Maya sprechen"
            actionHref="/call"
          />
        ) : (
          <OpenHomeworkPractice
            assignment={assignment}
            assignments={assignments}
            summary={summary}
            onSelect={id => setAssignment(assignments.find(a => a.id === id) ?? assignment)}
            onReload={completed => {
              void loadAll(true);
              if (completed) setTab("done");
            }}
          />
        )
      ) : history.filter(h => h.status === "completed" || h.status === "skipped").length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={28} />}
          title="Noch nichts erledigt"
          description="Fertige Hausaufgaben erscheinen hier — mit deinen Aufnahmen zum Anhören."
        />
      ) : (
        <div>
          {history
            .filter(h => h.status === "completed" || h.status === "skipped")
            .map(item => (
            <HistoryCard key={item.id} assignment={item} />
          ))}
        </div>
      )}
    </div>
  );
}
