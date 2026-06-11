"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSpeechRecorder } from "@/components/SpeechRecorder";

// ── Scenarios ─────────────────────────────────────────────
const SCENARIOS = [
  {
    id: "baeckerei",
    title: "In der Bäckerei",
    emoji: "🥐",
    level: "A1",
    description: "Brot kaufen, Preise fragen",
    scene: "Eine gemütliche Bäckerei in Deutschland",
    mayaRole: "Bäckerin",
    userRole: "Kunde",
    mayaEmoji: "👩‍🍳",
    userEmoji: "🧑",
    color: "#e8643a",
    steps: [
      { maya: "Guten Morgen! Was darf es sein?", hint: "Good morning! What can I get you?", expect: "order something", keywords: ["bitte", "möchte", "hätte", "brötchen", "brot", "croissant", "kuchen"] },
      { maya: "Gerne! Wie viele möchten Sie?", hint: "How many would you like?", expect: "say a number", keywords: ["ein", "zwei", "drei", "vier", "fünf", "sechs"] },
      { maya: "Das macht 2,50 Euro. Bezahlen Sie bar oder mit Karte?", hint: "That's €2.50. Cash or card?", expect: "say cash or card", keywords: ["bar", "karte", "bargeld"] },
      { maya: "Vielen Dank! Auf Wiedersehen!", hint: "Thank you! Goodbye!", expect: "say goodbye", keywords: ["danke", "wiedersehen", "tschüss", "ciao"] },
    ],
  },
  {
    id: "cafe",
    title: "Im Café",
    emoji: "☕",
    level: "A1",
    description: "Kaffee bestellen, Smalltalk",
    scene: "Ein modernes Café in Berlin",
    mayaRole: "Kellnerin",
    userRole: "Gast",
    mayaEmoji: "👩‍💼",
    userEmoji: "🧑",
    color: "#7c4daa",
    steps: [
      { maya: "Hallo! Was kann ich Ihnen bringen?", hint: "Hello! What can I bring you?", expect: "order a drink", keywords: ["kaffee", "tee", "wasser", "latte", "cappuccino", "espresso", "bitte", "möchte"] },
      { maya: "Möchten Sie auch etwas zu essen?", hint: "Would you also like something to eat?", expect: "order food or decline", keywords: ["ja", "nein", "danke", "kuchen", "sandwich", "bitte", "gerne"] },
      { maya: "Gerne! Woher kommen Sie, wenn ich fragen darf?", hint: "Where are you from, if I may ask?", expect: "say where you're from", keywords: ["ich", "komme", "bin", "aus", "india", "deutschland", "england"] },
      { maya: "Oh, interessant! Wie lange sind Sie schon in Deutschland?", hint: "How long have you been in Germany?", expect: "say how long", keywords: ["seit", "jahr", "monat", "woche", "schon", "lange"] },
      { maya: "Das ist toll! Hier ist Ihre Rechnung. Das macht 4,80 Euro.", hint: "That's great! Here's your bill. €4.80 please.", expect: "pay and say goodbye", keywords: ["danke", "bitte", "wiedersehen", "tschüss"] },
    ],
  },
  {
    id: "bahnhof",
    title: "Am Bahnhof",
    emoji: "🚂",
    level: "A1",
    description: "Tickets kaufen, Gleise finden",
    scene: "Hauptbahnhof München",
    mayaRole: "Schaffnerin",
    userRole: "Reisender",
    mayaEmoji: "👩‍✈️",
    userEmoji: "🎒",
    color: "#2196f3",
    steps: [
      { maya: "Guten Tag! Wohin möchten Sie fahren?", hint: "Good day! Where would you like to go?", expect: "say destination", keywords: ["nach", "berlin", "münchen", "hamburg", "frankfurt", "köln", "fahren", "möchte"] },
      { maya: "Einfache Fahrt oder Hin- und Rückfahrt?", hint: "One way or return ticket?", expect: "choose ticket type", keywords: ["einfach", "hin", "rückfahrt", "return", "einmal"] },
      { maya: "Der nächste Zug fährt um 14:30 Uhr. Das kostet 29 Euro. Nehmen Sie ihn?", hint: "Next train is at 14:30. That's €29. Do you want it?", expect: "say yes or ask question", keywords: ["ja", "bitte", "nehme", "gut", "okay", "welches", "gleis"] },
      { maya: "Gleis 7. Hier ist Ihr Ticket. Gute Reise!", hint: "Platform 7. Here's your ticket. Have a good trip!", expect: "say thank you", keywords: ["danke", "schön", "vielen", "tschüss"] },
    ],
  },
];

type Phase = "pick" | "playing" | "completed";

export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [scenario, setScenario] = useState<typeof SCENARIOS[0] | null>(null);
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<{ role: "maya" | "user"; text: string; correct?: boolean }[]>([]);
  const [liveText, setLiveText] = useState("");
  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [apiKey] = useState(() => process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "");
  const finalBufferRef = useRef("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveText]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      finalBufferRef.current += text;
      setLiveText(finalBufferRef.current);
    } else {
      setLiveText(finalBufferRef.current + text);
    }
  }, []);

  const handleEnd = useCallback(() => {
    const text = finalBufferRef.current.trim();
    if (text) submitAnswer(text);
    finalBufferRef.current = "";
    setLiveText("");
    setListening(false);
  }, []);

  const { start, stop } = useSpeechRecorder({
    apiKey,
    onTranscript: handleTranscript,
    onEnd: handleEnd,
    onError: () => setListening(false),
  });

  const toggleMic = () => {
    if (listening) { stop(); setListening(false); }
    else { finalBufferRef.current = ""; start(); setListening(true); }
  };

  const submitAnswer = (text: string) => {
    if (!scenario || !text.trim()) return;
    const currentStep = scenario.steps[step];
    const lower = text.toLowerCase();
    const correct = currentStep.keywords.some(k => lower.includes(k));
    const newMessages = [...messages, { role: "user" as const, text: text.trim(), correct }];
    setMessages(newMessages);
    setInputText("");
    setLiveText("");
    setShowHint(false);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      const nextStep = step + 1;
      if (nextStep < scenario.steps.length) {
        setStep(nextStep);
        setMessages(prev => [...prev, { role: "maya" as const, text: scenario.steps[nextStep].maya }]);
      } else {
        setPhase("completed");
      }
    }, 800);
  };

  const startScenario = (s: typeof SCENARIOS[0]) => {
    setScenario(s);
    setStep(0);
    setScore(0);
    setMessages([{ role: "maya", text: s.steps[0].maya }]);
    setPhase("playing");
  };

  // ── PICK ─────────────────────────────────────────────
  if (phase === "pick") return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 300 }}>Üben</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>Rollenspiele</span>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
          Übe echte Alltagssituationen auf Deutsch. Sprich oder tippe deine Antworten.
        </p>

        <Link href="/exercises/spelling" style={{
          display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
          background: "rgba(8,145,178,0.06)", border: "0.5px solid rgba(8,145,178,0.25)",
          borderRadius: 14, padding: "16px", textDecoration: "none",
        }}>
          <span style={{ fontSize: 32 }}>✍️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-serif)", marginBottom: 4 }}>Buchstabieren</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Name, Beruf, Wörter — wie am Telefon buchstabieren.</div>
          </div>
          <span style={{ color: "var(--text-dim)" }}>→</span>
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SCENARIOS.map(s => (
            <button key={s.id} onClick={() => startScenario(s)} style={{
              background: "var(--surface)", border: "0.5px solid var(--border)",
              borderRadius: 14, padding: "16px", textAlign: "left",
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
              borderLeft: `3px solid ${s.color}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 36 }}>{s.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-serif)" }}>{s.title}</span>
                    <span style={{ fontSize: 10, background: `${s.color}20`, color: s.color, border: `0.5px solid ${s.color}40`, padding: "1px 6px", borderRadius: 4 }}>{s.level}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.description}</span>
                </div>
                <span style={{ fontSize: 16, color: "var(--text-dim)" }}>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── COMPLETED ────────────────────────────────────────
  if (phase === "completed" && scenario) return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top,0px) + 24px) 16px calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>Gut gemacht!</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{score} von {scenario.steps.length} richtig</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12 }}>
          {Array.from({ length: scenario.steps.length }, (_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < score ? "#27ae60" : "var(--border)" }} />
          ))}
        </div>
      </div>

      <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ maxWidth: "85%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, paddingLeft: 4 }}>
              {msg.role === "user" ? "Du" : `${scenario.mayaEmoji} ${scenario.mayaRole}`}
            </div>
            <div style={{
              padding: "8px 12px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user"
                ? msg.correct ? `linear-gradient(135deg, ${scenario.color}cc, ${scenario.color})` : "linear-gradient(135deg, #c0392b, #e74c3c)"
                : "var(--surface)",
              border: msg.role === "maya" ? "0.5px solid var(--border)" : "none",
            }}>
              <p style={{ fontSize: 13, color: msg.role === "user" ? "#fff" : "var(--text)", lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
              {msg.role === "user" && (
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{msg.correct ? "✓ Sehr gut!" : "✗ Nächstes Mal!"}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => startScenario(scenario)} style={{ flex: 1, padding: 14, borderRadius: 10, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)", minHeight: 48 }}>
          Nochmal
        </button>
        <button onClick={() => setPhase("pick")} style={{ flex: 1, padding: 14, borderRadius: 10, border: `0.5px solid ${scenario.color}60`, background: `${scenario.color}15`, color: scenario.color, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)", minHeight: 48 }}>
          Anderes Szenario
        </button>
      </div>
    </div>
  );

  // ── PLAYING ───────────────────────────────────────────
  if (!scenario) return null;
  const currentStep = scenario.steps[step];

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", paddingTop: "calc(env(safe-area-inset-top,0px) + 0px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 0px)" }}>

      {/* Scene header */}
      <div style={{ background: `linear-gradient(135deg, ${scenario.color}dd, ${scenario.color}aa)`, padding: "16px 16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button onClick={() => setPhase("pick")} style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.15)", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-mono)" }}>← Zurück</button>
          <div style={{ display: "flex", gap: 4 }}>
            {scenario.steps.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < step ? "rgba(255,255,255,0.9)" : i === step ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.3s" }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-mono)" }}>{step + 1}/{scenario.steps.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 32 }}>{scenario.emoji}</span>
          <div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 400, color: "#fff", marginBottom: 2 }}>{scenario.title}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{scenario.scene}</p>
          </div>
        </div>
      </div>

      {/* Chat bubbles */}
      <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10, WebkitOverflowScrolling: "touch" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ maxWidth: "80%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, paddingLeft: 4 }}>
              {msg.role === "user" ? `${scenario.userEmoji} Du` : `${scenario.mayaEmoji} ${scenario.mayaRole}`}
            </div>
            <div style={{
              padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user"
                ? msg.correct !== false ? `linear-gradient(135deg, ${scenario.color}dd, ${scenario.color})` : "linear-gradient(135deg, #c0392b, #e74c3c)"
                : "#f0ebff",
              border: msg.role === "maya" ? `0.5px solid ${scenario.color}30` : "none",
            }}>
              <p style={{ fontSize: 14, color: msg.role === "user" ? "#fff" : "var(--text)", lineHeight: 1.6, margin: 0 }}>{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Live text */}
        {liveText && (
          <div style={{ maxWidth: "80%", alignSelf: "flex-end" }}>
            <div style={{ padding: "10px 14px", borderRadius: "16px 16px 4px 16px", background: `${scenario.color}20`, border: `0.5px solid ${scenario.color}40` }}>
              <p style={{ fontSize: 14, color: scenario.color, lineHeight: 1.6, margin: 0 }}>
                {liveText}
                <span style={{ display: "inline-block", width: 2, height: "1em", background: scenario.color, marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />
              </p>
            </div>
          </div>
        )}

        {/* Hint */}
        {showHint && (
          <div style={{ background: "#fff8e1", border: "0.5px solid #ffd54f", borderRadius: 10, padding: "10px 14px", alignSelf: "center", maxWidth: "90%" }}>
            <p style={{ fontSize: 12, color: "#795548", margin: 0 }}>💡 {currentStep.hint}</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 16px 16px", borderTop: "0.5px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {/* Text input */}
          <div style={{ flex: 1, background: "var(--surface)", border: `0.5px solid ${listening ? scenario.color : "var(--border)"}`, borderRadius: 20, padding: "10px 14px", transition: "border-color 0.2s" }}>
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && inputText.trim()) submitAnswer(inputText); }}
              placeholder="Auf Deutsch antworten..."
              style={{ width: "100%", background: "none", border: "none", color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)", outline: "none" }}
            />
          </div>

          {/* Send or mic */}
          {inputText ? (
            <button onClick={() => submitAnswer(inputText)} style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${scenario.color}, ${scenario.color}aa)`, border: "none", color: "#fff", fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              →
            </button>
          ) : (
            <button onClick={toggleMic} style={{ width: 44, height: 44, borderRadius: "50%", background: listening ? `linear-gradient(135deg, ${scenario.color}, ${scenario.color}aa)` : "var(--surface)", border: `0.5px solid ${listening ? "transparent" : "var(--border)"}`, color: listening ? "#fff" : scenario.color, fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: listening ? `0 0 0 8px ${scenario.color}20` : "none", transition: "all 0.2s" }}>
              🎙️
            </button>
          )}

          {/* Hint */}
          <button onClick={() => setShowHint(h => !h)} style={{ width: 44, height: 44, borderRadius: "50%", background: showHint ? "#fff8e1" : "var(--surface)", border: `0.5px solid ${showHint ? "#ffd54f" : "var(--border)"}`, color: "#795548", fontSize: 16, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            💡
          </button>
        </div>
      </div>
    </div>
  );
}
