"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ContentWord {
  id: string;
  german: string;
  english: string;
  level: string;
  source: "placement" | "common" | "career" | "generated";
  category?: string;
  topic?: string;
}

interface ContentSentence {
  id: string;
  german: string;
  english: string;
  level: string;
  source?: "static" | "generated";
  category?: string;
  topic?: string;
}

interface Catalog {
  words: ContentWord[];
  sentences: ContentSentence[];
  counts: {
    words: { total: number; placement: number; common: number; career: number; generated: number; byLevel: Record<string, number> };
    sentences: { total: number; byLevel: Record<string, number> };
  };
}

type Tab = "words" | "sentences";

const LEVELS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

export default function AdminContentPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("words");
  const [level, setLevel] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/content")
      .then(r => {
        if (r.status === 401) { router.push("/mode"); return null; }
        return r.json();
      })
      .then(d => { if (d) setCatalog(d); })
      .finally(() => setLoading(false));
  }, [router]);

  const filteredWords = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.words.filter(w => {
      if (level !== "all" && w.level !== level) return false;
      if (!q) return true;
      return w.german.toLowerCase().includes(q) || w.english.toLowerCase().includes(q) || w.id.includes(q);
    });
  }, [catalog, level, search]);

  const filteredSentences = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.sentences.filter(s => {
      if (level !== "all" && s.level !== level) return false;
      if (!q) return true;
      return s.german.toLowerCase().includes(q) || s.english.toLowerCase().includes(q) || s.id.includes(q);
    });
  }, [catalog, level, search]);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--red)", color: "white", padding: "2px 6px", borderRadius: 3 }}>ADMIN</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>Übungsinhalt</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/generate" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>Generieren</Link>
          <Link href="/admin" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Nutzer</Link>
        </div>
      </header>

      {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 24 }}>Lädt...</p>}

      {catalog && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 16 }}>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Wörter</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)", marginBottom: 6 }}>{catalog.counts.words.total}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5 }}>
                Placement {catalog.counts.words.placement} · Common {catalog.counts.words.common} · Career {catalog.counts.words.career} · Generated {catalog.counts.words.generated}
              </div>
            </div>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Sätze</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)", marginBottom: 6 }}>{catalog.counts.sentences.total}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5 }}>
                {Object.entries(catalog.counts.sentences.byLevel).map(([lv, n]) => `${lv} ${n}`).join(" · ")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
            {(["words", "sentences"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)",
                  border: "0.5px solid var(--border)",
                  background: tab === t ? "#7F77DD" : "var(--surface)",
                  color: tab === t ? "#fff" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {t === "words" ? "Wörter" : "Sätze"}
              </button>
            ))}
          </div>

          <div style={{ padding: "0 16px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEVELS.map(lv => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                style={{
                  minHeight: 32, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)",
                  border: level === lv ? "1.5px solid #7F77DD" : "0.5px solid var(--border)",
                  background: level === lv ? "#EEEDFE" : "var(--surface)",
                  color: level === lv ? "#7F77DD" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {lv === "all" ? "Alle" : lv}
              </button>
            ))}
          </div>

          <div style={{ padding: "0 16px 12px" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === "words" ? "Wort suchen..." : "Satz suchen..."}
              style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)" }}
            />
          </div>

          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {tab === "words" ? filteredWords.map(w => (
              <div key={w.id} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#7F77DD", fontFamily: "var(--font-mono)" }}>{w.level}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{w.source} · {w.id}</span>
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text)", margin: "0 0 4px", lineHeight: 1.35 }}>{w.german}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>{w.english}</p>
                {w.source === "generated" && (w.category || w.topic) && (
                  <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "6px 0 0", fontFamily: "var(--font-mono)" }}>
                    {[w.category, w.topic].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            )) : filteredSentences.map(s => (
              <div key={s.id} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#7F77DD", fontFamily: "var(--font-mono)" }}>{s.level}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                    {s.source === "generated" ? "generated" : "static"} · {s.id}
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--text)", margin: "0 0 4px", lineHeight: 1.4 }}>{s.german}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>{s.english}</p>
                {s.source === "generated" && (s.category || s.topic) && (
                  <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "6px 0 0", fontFamily: "var(--font-mono)" }}>
                    {[s.category, s.topic].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))}

            {tab === "words" && filteredWords.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>Keine Wörter gefunden.</p>
            )}
            {tab === "sentences" && filteredSentences.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>Keine Sätze gefunden.</p>
            )}
          </div>
          <div style={{ height: 32 }} />
        </>
      )}
    </div>
  );
}
