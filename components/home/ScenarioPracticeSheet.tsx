"use client";

import { useRouter } from "next/navigation";
import { BookOpen, MessageSquare, Phone, X } from "lucide-react";
import type { PracticeScenario } from "@/lib/exercises/scenarios";

interface ScenarioPracticeSheetProps {
  scenario: PracticeScenario;
  onClose: () => void;
}

export function ScenarioPracticeSheet({ scenario, onClose }: ScenarioPracticeSheetProps) {
  const router = useRouter();

  const goWords = () => {
    router.push(`/exercises/words?category=${scenario.wordCategory}&scenario=${scenario.id}`);
  };

  const goSentences = () => {
    router.push(`/exercises/sentences?category=${scenario.sentenceCategory}&scenario=${scenario.id}`);
  };

  const goCall = () => {
    localStorage.setItem("maya_voice", "soniox");
    router.push(`/call?scenario=${scenario.id}`);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(45, 32, 24, 0.45)",
          border: "none",
          zIndex: 40,
          cursor: "pointer",
        }}
      />
      <div
        className="animate-slide-up"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 390,
          zIndex: 41,
          background: "var(--surface-solid)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 18px calc(24px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -12px 40px rgba(45, 32, 24, 0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: scenario.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                boxShadow: `0 8px 20px ${scenario.shadow}`,
              }}
            >
              {scenario.emoji}
            </span>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", fontFamily: "var(--font-serif)" }}>
                {scenario.label}
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Wie möchtest du üben?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid var(--border-light)",
              background: "var(--surface)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PracticeModeButton
            emoji="📚"
            icon={<BookOpen size={20} />}
            label="Wörter"
            subtext="Flashcards zu diesem Thema"
            onClick={goWords}
            tone="#4A90E2"
          />
          <PracticeModeButton
            emoji="🧩"
            icon={<MessageSquare size={20} />}
            label="Sätze"
            subtext="Satzbau in dieser Situation"
            onClick={goSentences}
            tone="#805AD5"
          />
          <PracticeModeButton
            emoji="📞"
            icon={<Phone size={20} />}
            label="Mit Maya sprechen"
            subtext="Freies Gespräch in dieser Szene"
            onClick={goCall}
            tone="#FF6B35"
            primary
          />
        </div>
      </div>
    </>
  );
}

function PracticeModeButton({
  emoji,
  icon,
  label,
  subtext,
  onClick,
  tone,
  primary,
}: {
  emoji: string;
  icon: React.ReactNode;
  label: string;
  subtext: string;
  onClick: () => void;
  tone: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <button type="button" onClick={onClick} className="ui-btn-primary" style={{ justifyContent: "flex-start" }}>
        <span style={{ fontSize: 24 }}>{emoji}</span>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{label}</span>
          <span style={{ display: "block", fontSize: 12, opacity: 0.9, fontWeight: 400 }}>{subtext}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 20,
        border: "none",
        background: "#fff",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: `${tone}18`,
          color: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {emoji}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{subtext}</span>
      </span>
    </button>
  );
}
