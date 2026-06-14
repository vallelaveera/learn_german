"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GrammarExerciseSession } from "@/components/grammar/catalog/GrammarExerciseSession";
import { getCategoryBlock, levelColor, levelLightColor } from "@/lib/grammar/verified-curriculum";

export default function GrammarPrepositionsPage() {
  const block = getCategoryBlock("B1", "prepositions");
  const color = levelColor("B1");
  const light = levelLightColor("B1");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px calc(env(safe-area-inset-bottom, 0px) + 88px)",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <Link
          href="/grammar"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          <ChevronLeft size={16} />
          Grammatik
        </Link>

        <p style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 6px", textTransform: "uppercase" }}>
          B1+ · Präpositionen
        </p>
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px" }}>
          Präpositionen
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
          Verb + Präposition · da-/wo- Verbindungen
        </p>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color }}>Grundlagen</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55 }}>
            {block.basic.map((item, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{item}</li>
            ))}
          </ul>
        </section>

        <section
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 12,
            background: light,
            border: `1px solid ${color}33`,
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
            Vollständiger Präpositionen-Trainer (Wechselpräpositionen, Portale) folgt in einer
            späteren Version. B1-Übungen aus dem verifizierten Curriculum sind unten verfügbar.
          </p>
        </section>

        <GrammarExerciseSession exercises={block.exercises} levelColor={color} />
      </div>
    </div>
  );
}
