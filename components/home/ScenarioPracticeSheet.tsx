"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, MessageSquare, Phone, X } from "lucide-react";
import type { PracticeScenario } from "@/lib/exercises/scenarios";

interface ScenarioPracticeSheetProps {
  scenario: PracticeScenario;
  onClose: () => void;
}

export function ScenarioPracticeSheet({ scenario, onClose }: ScenarioPracticeSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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

  if (!mounted) return null;

  return createPortal(
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
          zIndex: 200,
          cursor: "pointer",
        }}
      />
      <div
        className="animate-slide-up"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          margin: "0 auto",
          width: "100%",
          maxWidth: 390,
          zIndex: 201,
          background: "var(--surface-solid)",
          borderRadius: "24px 24px 0 0",
          padding: "16px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -12px 40px rgba(45, 32, 24, 0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: scenario.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {scenario.emoji}
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 2px", fontFamily: "var(--font-serif)" }}>
                {scenario.label}
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                Wie üben?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--border-light)",
              background: "var(--surface)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PracticeModeButton emoji="📚" label="Wörter" subtext="Flashcards" onClick={goWords} tone="#4A90E2" />
          <PracticeModeButton emoji="🧩" label="Sätze" subtext="Satzbau" onClick={goSentences} tone="#805AD5" />
          <PracticeModeButton emoji="📞" label="Anruf" subtext="Mit Maya sprechen" onClick={goCall} tone="#FF6B35" primary />
        </div>
      </div>
    </>,
    document.body,
  );
}

function PracticeModeButton({
  emoji,
  label,
  subtext,
  onClick,
  tone,
  primary,
}: {
  emoji: string;
  label: string;
  subtext: string;
  onClick: () => void;
  tone: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="ui-btn-primary"
        style={{ justifyContent: "flex-start", minHeight: 48, padding: "10px 14px", fontSize: 14 }}
      >
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{label}</span>
          <span style={{ display: "block", fontSize: 11, opacity: 0.9, fontWeight: 400 }}>{subtext}</span>
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
        padding: "10px 12px",
        borderRadius: 16,
        border: "none",
        background: "#fff",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: `${tone}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {emoji}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{subtext}</span>
      </span>
    </button>
  );
}
