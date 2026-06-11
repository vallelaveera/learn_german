"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, Play, ClipboardList } from "lucide-react";
import { HomeworkRecorder, playBlobUrl } from "@/components/HomeworkRecorder";
import { speakExercisePrompt, unlockExerciseAudio } from "@/lib/exercise-speech";
import { EmptyState } from "@/components/ui/EmptyState";
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

function computeProgress(a: HomeworkAssignment): Progress {
  return getHomeworkProgress(a);
}

export function HomeworkPractice() {
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [summary, setSummary] = useState<HomeworkSummary | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  const pickCurrent = useCallback((list: HomeworkAssignment[]) => {
    return list[0] ?? null;
  }, []);

  const load = useCallback(() => {
    fetch("/api/homework")
      .then(r => r.json())
      .then(data => {
        setEnabled(data.enabled !== false);
        const list: HomeworkAssignment[] = data.assignments ?? (data.assignment ? [data.assignment] : []);
        setAssignments(list);
        const current = pickCurrent(list);
        setAssignment(current);
        setSummary(data.summary ?? null);
        setProgress(current ? computeProgress(current) : null);
        setSentenceIdx(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pickCurrent]);

  useEffect(() => { load(); }, [load]);

  const sentence: HomeworkSentence | undefined = assignment?.sentences[sentenceIdx];
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
        const remaining = assignments.filter(a => a.id !== updated.id);
        setAssignments(remaining);
        const next = pickCurrent(remaining);
        setAssignment(next);
        setProgress(next ? computeProgress(next) : null);
        setSentenceIdx(0);
        load();
      } else {
        setAssignment(updated);
        setProgress(computeProgress(updated));
        if (reps.length + 1 >= 3 && sentenceIdx < assignment.sentences.length - 1) {
          setTimeout(() => setSentenceIdx(i => i + 1), 600);
        }
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
    if (!assignment) return;
    await fetch("/api/homework", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip", homeworkId: assignment.id }),
    });
    load();
  };

  if (loading) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>Lädt...</p>;
  }

  if (!enabled) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 8 }}>Hausaufgaben nicht aktiviert</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>HOMEWORK_ENABLED muss auf dem Server gesetzt sein.</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="Keine Hausaufgaben"
        description="Ruf Maya an — nach dem Gespräch bekommst du neue Sätze zum Üben."
        actionLabel="Mit Maya sprechen"
        actionHref="/call"
      />
    );
  }

  const batchLabel = assignments.length > 1
    ? `Set ${assignments.findIndex(a => a.id === assignment.id) + 1} von ${assignments.length}`
    : null;
  const repToDo = nextRepIndex();

  return (
    <div>
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
            {summary?.completedReps ?? progress?.completedReps ?? 0} / {summary?.totalReps ?? progress?.totalReps ?? 15} gesamt
          </span>
        </div>
        <div className="ui-progress-track">
          <div
            className="ui-progress-fill"
            style={{
              width: `${((summary?.completedReps ?? progress?.completedReps ?? 0) / (summary?.totalReps ?? progress?.totalReps ?? 15)) * 100}%`,
            }}
          />
        </div>
      </div>

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
        {repToDo ? `Aufnahme ${repToDo} von 3 — tippe zum Aufnehmen, nochmal zum Stoppen` : "Satz fertig!"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <HomeworkRecorder onRecorded={handleRecorded} onError={setError} disabled={uploading || !repToDo} />
        <button
          type="button"
          onClick={playMaya}
          disabled={ttsLoading}
          className="ui-btn-ghost"
        >
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
