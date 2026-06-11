"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpellingCard } from "@/components/SpellingCard";
import type { SpellingItem } from "@/lib/exercises/types";

export default function SpellingPage() {
  const router = useRouter();
  const [items, setItems] = useState<SpellingItem[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [results, setResults] = useState<{ itemId: string; german: string; answer: string; input: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/exercises/spelling")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => { if (data?.items) setItems(data.items); })
      .finally(() => setLoading(false));
  }, [router]);

  const finish = async (allResults: typeof results) => {
    const res = await fetch("/api/exercises/spelling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: allResults }),
    });
    const data = await res.json();
    setFinished({ score: data.score ?? 0, total: data.total ?? allResults.length });
  };

  const handleSubmit = () => {
    const item = items[index];
    if (!item || !input.trim() || feedback) return;
    const entry = { itemId: item.id, german: item.label, answer: item.answer, input: input.trim() };
    const updated = [...results, entry];
    setResults(updated);

    const normalize = (s: string) => s.toLowerCase().replace(/[\s\-]/g, "").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
    const correct = normalize(item.answer) === normalize(input.trim());
    setFeedback(correct ? "correct" : "wrong");

    setTimeout(() => {
      if (index + 1 >= items.length) finish(updated);
      else { setIndex(i => i + 1); setInput(""); setFeedback(null); }
    }, 1000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Übung wird geladen...</p>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg)", padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>✍️</p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 300, marginBottom: 8 }}>
          {finished.score} / {finished.total} richtig
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>Buchstabieren wie im Kundengespräch.</p>
        <Link href="/practice" style={{ padding: "14px 28px", borderRadius: 10, background: "var(--accent)", color: "var(--bg)", fontSize: 14, fontFamily: "var(--font-mono)", textDecoration: "none" }}>
          Zurück zu Üben
        </Link>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 80 }}>Noch keine Wörter zum Buchstabieren. Sprich erst mit Maya!</p>
        <Link href="/mode" style={{ display: "inline-block", marginTop: 20, color: "var(--accent)" }}>← Zurück</Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
      paddingLeft: 20, paddingRight: 20,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <header style={{ width: "100%", maxWidth: 360, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300 }}>Buchstabieren</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Wie am Telefon</p>
        </div>
        <Link href="/practice" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      <SpellingCard
        item={items[index]}
        index={index}
        total={items.length}
        value={input}
        feedback={feedback}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
