"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryCard } from "@/components/exercises/CategoryCard";
import { SentencePreviewDurationSetting } from "@/components/exercises/SentencePreviewDurationSetting";
import {
  WORD_CATEGORIES,
  SENTENCE_CATEGORIES,
  type WordExerciseCategory,
  type SentenceExerciseCategory,
} from "@/lib/exercises/categories";

interface ExerciseCategoryPickerProps {
  type: "words" | "sentences";
}

const HEADERS = {
  words: {
    emoji: "📚",
    title: "Wörter üben",
    subtitle: "Wähle eine Kategorie — dann startet das Üben mit Maya-Stimme.",
    gradient: "linear-gradient(135deg, #FFD166 0%, #FF6B35 100%)",
  },
  sentences: {
    emoji: "🧩",
    title: "Sätze üben",
    subtitle: "Baue Sätze aus Wörtern — wähle zuerst ein Thema.",
    gradient: "linear-gradient(135deg, #6EC1FF 0%, #805AD5 100%)",
  },
};

export function ExerciseCategoryPicker({ type }: ExerciseCategoryPickerProps) {
  const router = useRouter();
  const header = HEADERS[type];
  const categories = type === "words" ? WORD_CATEGORIES : SENTENCE_CATEGORIES;

  const go = (id: string) => {
    router.push(`/exercises/${type}?category=${id}`);
  };

  return (
    <div
      style={{
        padding: "0 18px 24px",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <Link
          href="/mode"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent)",
            marginBottom: 20,
            textDecoration: "none",
          }}
        >
          ← Zurück
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 18px",
            borderRadius: 24,
            background: header.gradient,
            boxShadow: "var(--shadow-lg)",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "rgba(255,255,255,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            {header.emoji}
          </span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              {header.title}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.92)", margin: 0, lineHeight: 1.45 }}>
              {header.subtitle}
            </p>
          </div>
        </div>
      </header>

      {type === "sentences" && (
        <div style={{ marginBottom: 20 }}>
          <SentencePreviewDurationSetting />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {categories.map(cat => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onClick={() => go(cat.id)}
          />
        ))}
      </div>
    </div>
  );
}

export type { WordExerciseCategory, SentenceExerciseCategory };
