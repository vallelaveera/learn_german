"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Play, Settings2, Square, Volume2 } from "lucide-react";
import {
  DEFAULT_CALL_SETTINGS,
  loadCallSettings,
  saveCallSettings,
  type CallSettings,
} from "@/lib/call-settings";

interface CallPreCallSetupProps {
  onSettingsChange?: (settings: CallSettings) => void;
}

export function CallPreCallSetup({ onSettingsChange }: CallPreCallSetupProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<CallSettings>(DEFAULT_CALL_SETTINGS);
  const [testing, setTesting] = useState(false);
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [mayaTesting, setMayaTesting] = useState(false);
  const [mayaTestError, setMayaTestError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animRef = useRef<number>(0);
  const testUrlRef = useRef<string | null>(null);
  const mayaTestUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = loadCallSettings();
    setSettings(loaded);
    onSettingsChange?.(loaded);
  }, [onSettingsChange]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (testUrlRef.current) URL.revokeObjectURL(testUrlRef.current);
      if (mayaTestUrlRef.current) URL.revokeObjectURL(mayaTestUrlRef.current);
    };
  }, []);

  const persist = useCallback(
    (next: CallSettings) => {
      setSettings(next);
      saveCallSettings(next);
      onSettingsChange?.(next);
    },
    [onSettingsChange],
  );

  const stopMicTest = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setVolume(0);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setTesting(false);
    }
  }, []);

  const startMicTest = useCallback(async () => {
    stopMicTest();
    if (testUrlRef.current) {
      URL.revokeObjectURL(testUrlRef.current);
      testUrlRef.current = null;
      setTestUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setVolume(sum / data.length);
        animRef.current = requestAnimationFrame(tick);
      };
      tick();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        cancelAnimationFrame(animRef.current);
        setVolume(0);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setTesting(false);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          testUrlRef.current = url;
          setTestUrl(url);
        }
      };
      recorder.start();
      setTesting(true);
      setTimeout(() => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 3000);
    } catch {
      setTesting(false);
    }
  }, [stopMicTest]);

  const playTest = () => {
    if (!testUrl) return;
    const audio = new Audio(testUrl);
    void audio.play();
  };

  const testMaya = useCallback(async () => {
    setMayaTestError(null);
    setMayaTesting(true);
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hallo! Ich bin Maya. Kannst du mich hören?",
          provider: "soniox",
        }),
      });
      if (!res.ok || !res.body) throw new Error("TTS failed");
      const reader = res.body.getReader();
      const parts: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) parts.push(value);
      }
      const total = parts.reduce((n, p) => n + p.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const part of parts) {
        merged.set(part, offset);
        offset += part.length;
      }
      if (mayaTestUrlRef.current) URL.revokeObjectURL(mayaTestUrlRef.current);
      const url = URL.createObjectURL(new Blob([merged], { type: "audio/mpeg" }));
      mayaTestUrlRef.current = url;
      const audio = new Audio(url);
      await audio.play();
    } catch {
      setMayaTestError("Maya nicht hörbar — Internet prüfen.");
    } finally {
      setMayaTesting(false);
    }
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 300, marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 12,
          border: open ? "1.5px solid #7F77DD" : "1px solid rgba(127, 119, 221, 0.45)",
          background: open ? "rgba(127, 119, 221, 0.1)" : "rgba(127, 119, 221, 0.06)",
          color: "#534AB7",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          textAlign: "left",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#7F77DD",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Settings2 size={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
            Maya einstellen
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.35 }}>
            Configure Maya for better call quality
          </span>
        </span>
        <span style={{ fontSize: 11, color: "#7F77DD", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            padding: "14px",
            borderRadius: 12,
            border: "1px solid rgba(127, 119, 221, 0.35)",
            background: "var(--surface)",
            textAlign: "left",
            boxShadow: "0 4px 16px rgba(127, 119, 221, 0.08)",
          }}
        >
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.45 }}>
            Mikrofon & Stimme testen · Test mic & voice before you call
          </p>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
              Mikrofon testen
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px", lineHeight: 1.4 }}>
              Test your microphone
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => (testing ? stopMicTest() : void startMicTest())}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "none",
                  background: testing ? "var(--red)" : "#7F77DD",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {testing ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
              </button>
              {testUrl && (
                <button
                  type="button"
                  onClick={playTest}
                  style={{
                    minHeight: 40,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "0.5px solid var(--border)",
                    background: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Play size={14} />
                  Anhören
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 3, height: 20, alignItems: "flex-end" }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    borderRadius: 2,
                    height: `${Math.max(4, Math.min(20, (volume / 40) * 20 * (0.5 + i * 0.04)))}px`,
                    background: volume > 20 ? "#7F77DD" : "var(--border)",
                    transition: "height 0.08s",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.4 }}>
              {testing ? "Sprich 3 Sekunden…" : "Kurz testen, dann anhören"}
            </p>
          </div>

          <div style={{ marginBottom: 14, paddingTop: 14, borderTop: "0.5px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
              Maya testen
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px", lineHeight: 1.4 }}>
              Hear Maya&apos;s voice (same as in call)
            </p>
            <button
              type="button"
              onClick={() => void testMaya()}
              disabled={mayaTesting}
              style={{
                minHeight: 40,
                padding: "0 14px",
                borderRadius: 8,
                border: "0.5px solid var(--border)",
                background: "#fff",
                fontSize: 12,
                cursor: mayaTesting ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: mayaTesting ? 0.7 : 1,
              }}
            >
              <Volume2 size={14} />
              {mayaTesting ? "Lädt…" : "Stimme anhören"}
            </button>
            {mayaTestError && (
              <p style={{ fontSize: 10, color: "var(--red)", margin: "8px 0 0", lineHeight: 1.4 }}>
                {mayaTestError}
              </p>
            )}
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.4 }}>
              Gleicher Ton wie im Anruf — vor dem Start prüfen
            </p>
          </div>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text)", marginBottom: 4 }}>
              <span>Pause nach Maya · Pause after Maya</span>
              <span style={{ color: "var(--text-muted)" }}>{(settings.pauseBetweenTurnsMs / 1000).toFixed(1)}s</span>
            </span>
            <input
              type="range"
              min={0}
              max={2000}
              step={100}
              value={settings.pauseBetweenTurnsMs}
              onChange={e => persist({ ...settings, pauseBetweenTurnsMs: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "#7F77DD" }}
            />
          </label>

          <label style={{ display: "block" }}>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text)", marginBottom: 4 }}>
              <span>Mic früher starten · Start mic early</span>
              <span style={{ color: "var(--text-muted)" }}>{(settings.earlyMicMs / 1000).toFixed(1)}s vor Ende</span>
            </span>
            <input
              type="range"
              min={0}
              max={2000}
              step={100}
              value={settings.earlyMicMs}
              onChange={e => persist({ ...settings, earlyMicMs: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "#7F77DD" }}
            />
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.4 }}>
              <Volume2 size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Catches your first words better · Fängt deine ersten Worte besser ein
            </p>
          </label>
        </div>
      )}
    </div>
  );
}
