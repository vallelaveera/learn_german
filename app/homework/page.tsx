"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HomeworkRecorder, playBlobUrl } from "@/components/HomeworkRecorder";
import { fetchTTS } from "@/components/AudioPlayer";
import { HomeworkAssignment, HomeworkSentence, HomeworkRep } from "@/lib/types";

interface Progress {
  completedReps: number;
  totalReps: number;
  completedSentences: number;
}

export default function HomeworkPage() {
  const router = useRouter();
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/homework")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setEnabled(data.enabled !== false);
        setAssignment(data.assignment);
        setProgress(data.progress ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

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

      setAssignment(data.assignment);
      const p = data.assignment ? computeProgress(data.assignment) : null;
      setProgress(p);

      if (p && p.completedReps >= p.totalReps) {
        // all done
      } else if (reps.length + 1 >= 3 && sentenceIdx < (assignment.sentences.length - 1)) {
        setTimeout(() => setSentenceIdx(i => i + 1), 600);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const computeProgress = (a: HomeworkAssignment): Progress => {
    let completedReps = 0;
    let completedSentences = 0;
    const totalReps = a.sentences.length * 3;
    for (const s of a.sentences) {
      const r = a.progress[s.id] ?? [];
      completedReps += r.length;
      if (r.length >= 3) completedSentences += 1;
    }
    return { completedReps, totalReps, completedSentences };
  };

  const playMaya = async () => {
    if (!sentence) return;
    setTtsLoading(true);
    try {
      const url = await fetchTTS(sentence.text);
      const audio = new Audio(url);
      await audio.play();
    } catch {
      setError("TTS fehlgeschlagen");
    } finally {
      setTtsLoading(false);
    }
  };

  const skipHomework = async () => {
    if (!assignment) return;
    await fetch("/api/homework", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip", homeworkId: assignment.id }),
    });
    router.push("/mode");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Lädt...</p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <p style={{ fontSize: 16, color: "var(--text)", marginBottom: 12 }}>Hausaufgaben nicht aktiviert</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Frag deinen Admin, um Hausaufgaben freizuschalten.</p>
        <a href="/mode" style={{ color: "var(--accent)", fontSize: 14 }}>← Zurück</a>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>Keine Hausaufgaben</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Ruf Maya an — nach dem Gespräch bekommst du neue Sätze zum Üben.</p>
        <a href="/mode" style={{ color: "var(--accent)", fontSize: 14 }}>← Zurück</a>
      </div>
    );
  }

  const allDone = progress && progress.completedReps >= progress.totalReps;
  const repToDo = nextRepIndex();

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <a href="/mode" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>← Modus</a>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--text)" }}>Hausaufgaben</span>
        <button onClick={skipHomework} style={{ fontSize: 11, color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}>Skip</button>
      </header>

      {allDone ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🎉</p>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--text)", marginBottom: 8 }}>Super gemacht!</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>Alle 15 Aufnahmen fertig. Maya ist stolz auf dich.</p>
          <a href="/callmode" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 10, background: "var(--green)", color: "white", textDecoration: "none", fontSize: 14 }}>Jetzt mit Maya reden</a>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Satz {sentenceIdx + 1} / {assignment.sentences.length}
              </span>
              <span style={{ fontSize: 11, color: "var(--accent)" }}>
                {progress?.completedReps ?? 0} / {progress?.totalReps ?? 15} Aufnahmen
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--accent)", width: `${((progress?.completedReps ?? 0) / (progress?.totalReps ?? 15)) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>

          {/* Sentence card */}
          {sentence && (
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 24 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", lineHeight: 1.5, marginBottom: 12 }}>{sentence.text}</p>
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

          {/* Rep chips */}
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
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: `2px solid ${rep ? "var(--green)" : repToDo === i ? "var(--accent)" : "var(--border)"}`,
                    background: rep ? "rgba(39,174,96,0.1)" : "var(--surface)",
                    color: rep ? "var(--green)" : "var(--text-muted)",
                    fontSize: 14,
                    cursor: rep ? "pointer" : "default",
                  }}
                >
                  {rep ? "▶" : i}
                </button>
              );
            })}
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            {repToDo ? `Aufnahme ${repToDo} von 3 — tippe zum Aufnehmen, nochmal zum Stoppen` : "Satz fertig!"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <HomeworkRecorder
              onRecorded={handleRecorded}
              onError={setError}
              disabled={uploading || !repToDo}
            />
            <button
              type="button"
              onClick={playMaya}
              disabled={ttsLoading}
              style={{ padding: "10px 20px", borderRadius: 8, border: "0.5px solid var(--accent-dim)", background: "var(--accent-glow)", color: "var(--accent)", fontSize: 13, cursor: "pointer" }}
            >
              {ttsLoading ? "..." : "🔊 Maya anhören"}
            </button>
          </div>

          {error && <p style={{ textAlign: "center", color: "var(--red)", fontSize: 12, marginTop: 16 }}>{error}</p>}
          {uploading && <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>Speichert...</p>}

          {/* Nav between sentences */}
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
      )}
    </div>
  );
}
