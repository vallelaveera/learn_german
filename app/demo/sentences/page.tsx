"use client";

import { SentenceCard } from "@/components/illustrations/SentenceCard";
import { BATCH_SENTENCES } from "@/lib/content/sentences-batch";

/** Dev preview for batch-generated sentence illustrations. */
export default function SentenceIllustrationsDemoPage() {
  const preview = BATCH_SENTENCES.slice(0, 10);

  return (
    <div style={{
      minHeight: "100dvh",
      padding: "24px 16px",
      background: "var(--bg, #fff)",
    }}>
      <h1 style={{
        fontFamily: "var(--font-serif, serif)",
        fontSize: 20,
        fontWeight: 400,
        margin: "0 0 8px",
        textAlign: "center",
      }}>
        Sentence illustrations
      </h1>
      <p style={{
        fontSize: 12,
        color: "var(--text-muted, #666)",
        textAlign: "center",
        margin: "0 0 24px",
      }}>
        SVGs loaded from <code>data/illustrations/</code> via the API below.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
        maxWidth: 960,
        margin: "0 auto",
      }}>
        {preview.map(s => (
          <SentenceCard
            key={s.id}
            sentenceId={s.id}
            de={s.de}
            en={s.en}
            level={s.level}
          />
        ))}
      </div>
    </div>
  );
}
