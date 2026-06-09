"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface VocabWord {
  word: string;
  firstSeen: number;
  timesSeen: number;
  lastSeen: number;
  usedByUser?: boolean;
}

export default function WordsPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "practiced">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/vocab")
      .then(r => r.json())
      .then(d => { setVocab(d.words ?? []); setLoading(false); });
  }, []);

  const filtered = vocab
    .filter(w => filter === "all" ? true : filter === "practiced" ? w.usedByUser : !w.usedByUser)
    .filter(w => search ? w.word.toLowerCase().includes(search.toLowerCase()) : true);

  const total = vocab.length;
  const practiced = vocab.filter(w => w.usedByUser).length;
  const newWords = vocab.filter(w => !w.usedByUser).length;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--accent)", color: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>DE</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>Vokabeln</span>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "16px" }}>
        {[
          { label: "Gesamt", value: total, color: "var(--text)" },
          { label: "Gelernt", value: practiced, color: "var(--green)" },
          { label: "Neu", value: newWords, color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: "0 16px 12px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Wort suchen..."
          style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)" }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--border)", margin: "0 16px 16px" }}>
        {(["all", "new", "practiced"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, padding: "10px", fontSize: 11, letterSpacing: "0.06em",
            textTransform: "uppercase", cursor: "pointer", background: "none",
            border: "none", borderBottom: filter === f ? "2px solid var(--accent)" : "2px solid transparent",
            color: filter === f ? "var(--accent)" : "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}>
            {f === "all" ? "Alle" : f === "new" ? "Neu" : "Gelernt"}
          </button>
        ))}
      </div>

      {/* Word list */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Lädt...</p>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Keine Wörter gefunden.</p>
            <Link href="/mode" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8, display: "block" }}>Jetzt mit Maya sprechen →</Link>
          </div>
        )}
        {filtered.map(w => (
          <div key={w.word} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderLeft: w.usedByUser ? "2px solid var(--green)" : "2px solid var(--accent)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontFamily: "var(--font-serif)", color: "var(--text)", marginBottom: 3 }}>{w.word}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {w.timesSeen}× gehört · zuletzt {new Date(w.lastSeen).toLocaleDateString("de-DE")}
              </div>
              <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden", width: "100%" }}>
                <div style={{ height: "100%", borderRadius: 2, background: w.usedByUser ? "var(--green)" : "var(--accent)", width: `${Math.min(100, w.timesSeen * 20)}%`, transition: "width 0.3s" }} />
              </div>
            </div>
            <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, background: w.usedByUser ? "rgba(39,174,96,0.15)" : "var(--accent-glow)", color: w.usedByUser ? "var(--green)" : "var(--accent)", border: `0.5px solid ${w.usedByUser ? "rgba(39,174,96,0.4)" : "var(--accent-dim)"}`, whiteSpace: "nowrap" }}>
              {w.usedByUser ? "Gelernt ✓" : "Neu"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}
