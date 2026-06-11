"use client";

import { useEffect, useState } from "react";

interface Props {
  word: string;
  disabled?: boolean;
}

export function WordExamplesPanel({ word, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sentences, setSentences] = useState<string[] | null>(null);
  const [translations, setTranslations] = useState<string[] | null>(null);
  const [showEn, setShowEn] = useState(false);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [loadingTranslations, setLoadingTranslations] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setSentences(null);
    setTranslations(null);
    setShowEn(false);
    setLoadingSentences(false);
    setLoadingTranslations(false);
  }, [word]);

  const loadSentences = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (sentences) return;
    setLoadingSentences(true);
    try {
      const res = await fetch(`/api/examples?word=${encodeURIComponent(word)}&type=sentences`);
      const data = await res.json();
      setSentences(data.data ?? []);
    } catch {
      setSentences([]);
    } finally {
      setLoadingSentences(false);
    }
  };

  const loadTranslations = async () => {
    if (showEn && translations) {
      setShowEn(false);
      return;
    }
    if (translations) {
      setShowEn(true);
      return;
    }
    setLoadingTranslations(true);
    try {
      const res = await fetch(`/api/examples?word=${encodeURIComponent(word)}&type=translations`);
      const data = await res.json();
      setTranslations(data.data ?? []);
      setShowEn(true);
    } catch {
      setTranslations([]);
      setShowEn(true);
    } finally {
      setLoadingTranslations(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => void loadSentences()}
        disabled={disabled}
        style={{
          fontSize: 10,
          color: "var(--accent)",
          background: "none",
          border: "0.5px solid var(--accent-dim)",
          borderRadius: 4,
          padding: "4px 10px",
          cursor: disabled ? "default" : "pointer",
          fontFamily: "var(--font-mono)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {loadingSentences ? "..." : expanded ? "▲ Beispiele" : "▼ Beispiele"}
      </button>

      {expanded && (
        <div style={{
          marginTop: 8,
          padding: "10px 12px",
          background: "var(--bg)",
          borderRadius: 8,
          border: "0.5px solid var(--border)",
        }}>
          {loadingSentences && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Lädt...</p>
          )}
          {!loadingSentences && sentences && sentences.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>
              Keine Beispiele verfügbar.
            </p>
          )}
          {sentences?.map((s, i) => (
            <p
              key={i}
              style={{
                fontSize: 13,
                color: "var(--text)",
                lineHeight: 1.55,
                margin: i > 0 ? "8px 0 0" : 0,
                fontStyle: "italic",
              }}
            >
              „{s}"
            </p>
          ))}

          {showEn && translations && translations.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
              {translations.map((t, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                    margin: i > 0 ? "4px 0 0" : 0,
                  }}
                >
                  {i + 1}. {t}
                </p>
              ))}
            </div>
          )}

          {sentences && sentences.length > 0 && (
            <button
              type="button"
              onClick={() => void loadTranslations()}
              disabled={disabled || loadingTranslations}
              style={{
                marginTop: 10,
                fontSize: 10,
                color: "var(--text-muted)",
                background: "none",
                border: "0.5px solid var(--border)",
                borderRadius: 4,
                padding: "3px 10px",
                cursor: disabled ? "default" : "pointer",
                fontFamily: "var(--font-mono)",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {loadingTranslations ? "..." : showEn ? "EN ausblenden" : "EN anzeigen"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
