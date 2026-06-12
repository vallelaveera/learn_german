"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Volume2 } from "lucide-react";
import { ExerciseCategoryPicker } from "@/components/exercises/ExerciseCategoryPicker";
import { SentenceSelfRecorder, playRecordingUrls } from "@/components/exercises/SentenceSelfRecorder";
import { ExerciseShell } from "@/components/layout/ExerciseShell";
import { truncateForDisplay } from "@/lib/corrections";
import {
  getSentenceCategoryMeta,
  parseSentenceCategory,
  type SentenceExerciseCategory,
} from "@/lib/exercises/categories";
import {
  prefetchExerciseGerman,
  revokeExerciseSpeechPrefetch,
  speakExercisePrompt,
  stopExerciseSpeech,
  unlockExerciseAudio,
} from "@/lib/exercise-speech";

interface Chip {
  id: string;
  word: string;
}

interface SentenceExercise {
  id: string;
  german: string;
  english: string;
  level: string;
  words: string[];
  chips: Chip[];
  said?: string;
  note?: string;
}

type Phase = "preview" | "build" | "complete" | "done";

const PREVIEW_MS = 5000;

function SentencesInner() {
  const params = useSearchParams();
  const rawCategory = params.get("category");
  if (!rawCategory) {
    return (
      <ExerciseShell>
        <div style={{ padding: "0 18px" }}>
          <ExerciseCategoryPicker type="sentences" />
        </div>
      </ExerciseShell>
    );
  }

  const category = parseSentenceCategory(rawCategory);
  return <SentencesPractice category={category} sessionId={params.get("session")} />;
}

function SentencesPractice({
  category,
  sessionId,
}: {
  category: SentenceExerciseCategory;
  sessionId: string | null;
}) {
  const router = useRouter();
  const meta = getSentenceCategoryMeta(category);
  const fromCall = category === "call";

  const [exercises, setExercises] = useState<SentenceExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("preview");
  const [built, setBuilt] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [showEnHint, setShowEnHint] = useState(false);
  const [skipMaya, setSkipMaya] = useState(false);
  const [userRecordings, setUserRecordings] = useState<Record<number, string>>({});
  const [playingAll, setPlayingAll] = useState(false);

  const current = exercises[index];
  const currentRecording = userRecordings[index] ?? null;

  const exercisesUrl = fromCall
    ? `/api/exercises/sentences?source=call${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ""}`
    : `/api/exercises/sentences?category=${category}`;

  const loadExercises = useCallback(async (isMore = false) => {
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setNoMore(false);
    try {
      const res = await fetch(exercisesUrl);
      if (res.status === 401) { router.push("/login"); return false; }
      const data = await res.json();
      if (!data?.exercises?.length) {
        if (isMore) setNoMore(true);
        else setExercises([]);
        return false;
      }
      setExercises(data.exercises);
      setIndex(0);
      setScore(0);
      setBuilt([]);
      setWrongId(null);
      setShowEnHint(false);
      setPhase("preview");
      return true;
    } finally {
      if (isMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, [exercisesUrl, router]);

  const playGerman = useCallback(() => {
    if (!current) return;
    if (skipMaya && currentRecording) {
      const audio = new Audio(currentRecording);
      void audio.play();
      return;
    }
    if (skipMaya) return;
    unlockExerciseAudio();
    speakExercisePrompt(current.german, "de").catch(() => {});
  }, [current, skipMaya, currentRecording]);

  useEffect(() => {
    if (!current) return;
    void prefetchExerciseGerman(current.german);
    return () => revokeExerciseSpeechPrefetch(current.german);
  }, [current?.id, current?.german]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    if (phase !== "preview" || !current || skipMaya) return;
    let cancelled = false;
    const run = async () => {
      await prefetchExerciseGerman(current.german);
      if (!cancelled) await speakExercisePrompt(current.german, "de");
    };
    void run();
    const t = setTimeout(() => setPhase("build"), PREVIEW_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
      stopExerciseSpeech();
    };
  }, [phase, current?.id, index, skipMaya]);

  useEffect(() => {
    setShowEnHint(false);
  }, [index, phase]);

  const saveResult = (correct: boolean) => {
    if (!current) return;
    const body: {
      results: { itemId: string; german: string; correct: boolean }[];
      practicedCorrectionIds?: string[];
    } = {
      results: [{ itemId: current.id, german: current.german, correct }],
    };
    if (fromCall && correct) {
      body.practicedCorrectionIds = [current.id];
    }
    fetch("/api/exercises/sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const nextSentence = useCallback(() => {
    setBuilt([]);
    setWrongId(null);
    if (index + 1 >= exercises.length) {
      setPhase("done");
      return;
    }
    setIndex(i => i + 1);
    setPhase("preview");
  }, [index, exercises.length]);

  const handleChip = (chip: Chip) => {
    if (!current || wrongId) return;
    const expected = current.words[built.length];
    if (chip.word !== expected) {
      setWrongId(chip.id);
      setTimeout(() => setWrongId(null), 500);
      return;
    }
    const next = [...built, chip.word];
    setBuilt(next);
    if (next.length === current.words.length) {
      setScore(s => s + 1);
      saveResult(true);
      setPhase("complete");
      setTimeout(() => nextSentence(), 2000);
    }
  };

  const playAllRecordings = async () => {
    const urls = exercises.map((_, i) => userRecordings[i]).filter(Boolean) as string[];
    if (!urls.length) return;
    setPlayingAll(true);
    try {
      await playRecordingUrls(urls);
    } finally {
      setPlayingAll(false);
    }
  };

  if (loading) {
    return (
      <ExerciseShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh", padding: 24 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sätze werden geladen...</p>
        </div>
      </ExerciseShell>
    );
  }

  if (!exercises.length) {
    return (
      <ExerciseShell>
        <div style={{ padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>{meta?.emoji ?? "🧩"}</p>
        <p style={{ marginTop: 40, color: "var(--text-muted)" }}>
          {fromCall
            ? "Keine übbaren Korrekturen aus deinem Anruf."
            : "Keine Sätze in dieser Kategorie."}
        </p>
        <Link href="/exercises/sentences" style={{ color: "var(--accent)", marginTop: 16, display: "inline-block" }}>
          ← Andere Kategorie
        </Link>
        </div>
      </ExerciseShell>
    );
  }

  if (phase === "done") {
    const recordedCount = Object.keys(userRecordings).length;
    return (
      <ExerciseShell>
      <div style={{
        padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        minHeight: "70dvh",
      }}>
        <span
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: meta?.gradient ?? "var(--gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            marginBottom: 16,
            boxShadow: `0 8px 28px ${meta?.shadow ?? "var(--accent-glow)"}`,
          }}
        >
          {meta?.emoji ?? "🧩"}
        </span>
        <h1 className="ui-title-serif" style={{ fontSize: 26, marginBottom: 8 }}>
          {score} / {exercises.length} richtig
        </h1>
        <p className="ui-muted" style={{ marginBottom: noMore ? 12 : 28 }}>
          {meta?.label ?? "Sätze üben"}
        </p>
        {noMore && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Keine neuen Sätze gerade — schau in ein paar Tagen wieder vorbei.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
          {recordedCount > 0 && (
            <button
              type="button"
              onClick={() => void playAllRecordings()}
              disabled={playingAll}
              className="ui-btn-primary"
              style={{ fontSize: 14, opacity: playingAll ? 0.7 : 1 }}
            >
              {playingAll ? "Spielt ab..." : `Meine ${recordedCount} Aufnahmen anhören`}
            </button>
          )}
          {!noMore && (
            <button
              type="button"
              onClick={() => void loadExercises(true)}
              disabled={loadingMore}
              className="ui-btn-primary"
              style={{ fontSize: 14, opacity: loadingMore ? 0.7 : 1, cursor: loadingMore ? "wait" : "pointer" }}
            >
              {loadingMore ? "Lädt..." : "Weiter üben"}
            </button>
          )}
          <Link href="/exercises/sentences" className="ui-btn-ghost" style={{ textDecoration: "none", minHeight: 48, justifyContent: "center" }}>
            Kategorien
          </Link>
        </div>
      </div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell>
    <div style={{ paddingLeft: 20, paddingRight: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: meta?.gradient ?? "var(--gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {meta?.emoji ?? "🧩"}
          </span>
          <div>
            <p className="ui-title-serif" style={{ fontSize: 18, marginBottom: 4 }}>
              {meta?.label ?? "Satzbau"}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {index + 1} / {exercises.length} · {current?.level}
            </p>
          </div>
        </div>
        <Link href="/exercises/sentences" style={{ fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 10, textDecoration: "none" }}>←</Link>
      </header>

      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        {phase === "preview" && current && (
          <div style={{
            textAlign: "center", padding: "28px 20px", marginBottom: 24,
            background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)", borderRadius: 12,
          }}>
            <p style={{ fontSize: 10, color: "var(--accent)", marginBottom: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
              {fromCall ? "KORREKTUR AUS DEINEM ANRUF" : "MERKE DIR DEN SATZ"}
            </p>
            {fromCall && current.said && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontStyle: "italic", lineHeight: 1.5 }}>
                Du sagtest: „{truncateForDisplay(current.said, 120)}"
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", lineHeight: 1.45, margin: 0 }}>
                {current.german}
              </p>
              <button
                type="button"
                onClick={playGerman}
                className="ui-btn-ghost"
                style={{ flexShrink: 0, padding: "6px 8px" }}
                aria-label="Nochmal anhören"
              >
                <Volume2 size={14} />
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <SentenceSelfRecorder
                recordingUrl={currentRecording}
                skipMaya={skipMaya}
                onSkipMayaChange={setSkipMaya}
                onRecorded={url => setUserRecordings(prev => ({ ...prev, [index]: url }))}
                compact
              />
            </div>
          </div>
        )}

        {phase === "complete" && current && (
          <div style={{
            textAlign: "center", padding: "28px 20px", marginBottom: 24,
            background: "rgba(39,174,96,0.08)", border: "0.5px solid rgba(39,174,96,0.35)", borderRadius: 12,
          }}>
            <p style={{ fontSize: 10, color: "var(--green)", marginBottom: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>RICHTIG!</p>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", lineHeight: 1.45, marginBottom: 10 }}>{current.german}</p>
            {fromCall && current.note ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 12 }}>{current.note}</p>
            ) : current.english && !fromCall ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 12 }}>{current.english}</p>
            ) : null}
            <SentenceSelfRecorder
              recordingUrl={currentRecording}
              skipMaya={skipMaya}
              onSkipMayaChange={setSkipMaya}
              onRecorded={url => setUserRecordings(prev => ({ ...prev, [index]: url }))}
              compact
            />
          </div>
        )}

        {phase === "build" && current && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, flex: 1 }}>
                Baue den Satz aus dem Gedächtnis
              </p>
              <button
                type="button"
                onClick={playGerman}
                className="ui-btn-ghost"
                style={{ flexShrink: 0, padding: "6px 10px" }}
                aria-label="Nochmal anhören"
              >
                <Volume2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowEnHint(true)}
                disabled={showEnHint}
                style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `0.5px solid ${showEnHint ? "var(--accent-dim)" : "var(--border)"}`,
                  background: showEnHint ? "var(--accent-glow)" : "var(--surface)",
                  color: showEnHint ? "var(--accent)" : "var(--text-muted)",
                  cursor: showEnHint ? "default" : "pointer",
                }}
              >
                {showEnHint ? "EN ✓" : "EN"}
              </button>
            </div>
            {showEnHint && (
              <p style={{
                fontSize: 13, color: "var(--text-muted)", fontStyle: "italic",
                textAlign: "center", lineHeight: 1.5, margin: "0 0 16px",
              }}>
                {current.english}
              </p>
            )}

            <div style={{
              minHeight: 52, padding: "10px 12px", marginBottom: 16, borderRadius: 10,
              border: "0.5px solid var(--border)", background: "var(--surface)",
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
            }}>
              {built.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>Dein Satz...</span>
              )}
              {built.map((w, i) => (
                <span key={`${w}-${i}`} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 14,
                  background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)",
                  color: "var(--text)", fontFamily: "var(--font-serif)",
                }}>{w}</span>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {current.chips.map(chip => {
                const usedForWord = built.filter(w => w === chip.word).length;
                const totalInSentence = current.words.filter(w => w === chip.word).length;
                const isUsed = usedForWord >= totalInSentence;
                const isWrong = wrongId === chip.id;
                if (isUsed) return null;
                return (
                  <button
                    key={chip.id}
                    onClick={() => handleChip(chip)}
                    style={{
                      padding: "10px 14px", borderRadius: 8, fontSize: 14,
                      fontFamily: "var(--font-serif)", cursor: "pointer",
                      background: isWrong ? "rgba(192,57,43,0.15)" : "rgba(255,255,255,0.04)",
                      border: isWrong ? "1px solid var(--red)" : "0.5px solid var(--border)",
                      color: isWrong ? "var(--red)" : "var(--text-muted)",
                      transition: "all 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {chip.word}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </ExerciseShell>
  );
}

export default function SentencesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sätze werden geladen...</p>
      </div>
    }>
      <SentencesInner />
    </Suspense>
  );
}
