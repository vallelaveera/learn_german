"use client";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, Briefcase, Languages, Sparkles, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { HomeworkPractice } from "@/components/homework/HomeworkPractice";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatTile } from "@/components/ui/StatTile";
import { VocabIcon } from "@/components/vocab/VocabIcon";
import { getStatusFromScore } from "@/lib/vocab/iconColors";

interface VocabWord {
  word: string;
  firstSeen: number;
  timesSeen: number;
  lastSeen: number;
  usedByUser?: boolean;
  correctCount?: number;
}

interface CareerEntry {
  id: string;
  text: string;
  english: string;
  category: string;
  status: "used" | "exposed" | "unused";
}

type WordView = "vocab" | "homework" | "karriere";

export default function WordsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <WordsPageShell />
    </Suspense>
  );
}

function WordsPageShell() {
  const searchParams = useSearchParams();
  const isHomework = searchParams.get("view") === "homework";
  return (
    <PageShell title={isHomework ? "Hausaufgaben" : "Üben"}>
      <WordsPageInner />
    </PageShell>
  );
}

function WordsPageInner() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view");
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "practiced">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"length" | "frequency" | "recent">("length");
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [sentences, setSentences] = useState<Record<string, string[]>>({});
  const [translations, setTranslations] = useState<Record<string, string[]>>({});
  const [loadingSentences, setLoadingSentences] = useState<string | null>(null);
  const [loadingTranslations, setLoadingTranslations] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<WordView>(
    initialView === "homework" ? "homework" : initialView === "karriere" ? "karriere" : "vocab"
  );
  const [careerEntries, setCareerEntries] = useState<CareerEntry[]>([]);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerAvailable, setCareerAvailable] = useState(true);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "homework") setView("homework");
    else if (v === "karriere") setView("karriere");
    else if (v !== "homework") setView("vocab");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/vocab")
      .then(r => r.json())
      .then(d => { setVocab(d.words ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (view !== "karriere") return;
    setCareerLoading(true);
    fetch("/api/career-vocab")
      .then(r => {
        if (!r.ok) {
          setCareerAvailable(false);
          setCareerEntries([]);
          return null;
        }
        return r.json();
      })
      .then(d => {
        if (d) {
          setCareerAvailable(true);
          setCareerEntries(d.entries ?? []);
        }
        setCareerLoading(false);
      })
      .catch(() => {
        setCareerAvailable(false);
        setCareerLoading(false);
      });
  }, [view]);

  const filtered = vocab
    .filter(w => filter === "all" ? true : filter === "practiced" ? w.usedByUser : !w.usedByUser)
    .filter(w => search ? w.word.toLowerCase().includes(search.toLowerCase()) : true)
    .sort((a, b) => {
      if (sort === "length") return b.word.length - a.word.length;
      if (sort === "frequency") return b.timesSeen - a.timesSeen;
      return b.lastSeen - a.lastSeen;
    });


  const fetchSentences = async (word: string) => {
    if (expandedWord === word) { setExpandedWord(null); return; }
    setExpandedWord(word);
    if (sentences[word]) return;
    setLoadingSentences(word);
    try {
      const res = await fetch(`/api/examples?word=${encodeURIComponent(word)}&type=sentences`);
      const data = await res.json();
      setSentences(prev => ({ ...prev, [word]: data.data ?? [] }));
    } catch {}
    setLoadingSentences(null);
  };

  const fetchTranslations = async (word: string) => {
    if (translations[word]) {
      setShowTranslation(prev => ({ ...prev, [word]: !prev[word] }));
      return;
    }
    setLoadingTranslations(word);
    try {
      const res = await fetch(`/api/examples?word=${encodeURIComponent(word)}&type=translations`);
      const data = await res.json();
      setTranslations(prev => ({ ...prev, [word]: data.data ?? [] }));
      setShowTranslation(prev => ({ ...prev, [word]: true }));
    } catch {}
    setLoadingTranslations(null);
  };

  const newWords = vocab.filter(w => !w.usedByUser).length;

  const filteredCareer = careerEntries
    .filter(e => (search ? e.text.toLowerCase().includes(search.toLowerCase()) || e.english.toLowerCase().includes(search.toLowerCase()) : true));

  const careerStatusColor = (status: CareerEntry["status"]) => {
    if (status === "used") return "var(--green)";
    if (status === "exposed") return "var(--accent)";
    return "var(--text-dim)";
  };

  return (
      <div style={{ padding: "16px 18px" }}>
        {view === "homework" ? (
          <HomeworkPractice />
        ) : (
          <>
        <SegmentedTabs
          tabs={[
            { id: "vocab", label: "Vokabeln", icon: <BookOpen size={16} /> },
            { id: "karriere", label: "Karriere", icon: <Briefcase size={16} /> },
          ]}
          value={view === "karriere" ? "karriere" : "vocab"}
          onChange={id => setView(id as WordView)}
        />

        {view === "vocab" && (
          <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatTile label="Gesamt" value={vocab.length} icon={<Languages size={18} />} />
        <StatTile label="Gelernt" value={vocab.filter(w => w.usedByUser).length} icon={<CheckCircle2 size={18} />} accent="var(--green)" />
        <StatTile label="Neu" value={newWords} icon={<Sparkles size={18} />} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Wort suchen..."
          className="ui-card"
          style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--border-light)", color: "var(--text)", fontSize: 15, fontFamily: "var(--font-sans)", outline: "none" }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--border)", marginBottom: 16 }}>
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

      {/* Sort buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {([["length", "Länge"], ["frequency", "Häufigkeit"], ["recent", "Zuletzt"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSort(key)} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 11,
            cursor: "pointer", fontFamily: "var(--font-mono)",
            background: sort === key ? "var(--accent-glow)" : "var(--surface)",
            color: sort === key ? "var(--accent)" : "var(--text-muted)",
            border: `0.5px solid ${sort === key ? "var(--accent-dim)" : "var(--border)"}`,
          }}>{label}</button>
        ))}
      </div>

      {/* Word list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Lädt...</p>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Keine Wörter gefunden.</p>
            <Link href="/mode" style={{ color: "var(--accent)", fontSize: 13, marginTop: 8, display: "block" }}>Jetzt mit Maya sprechen →</Link>
          </div>
        )}
        {filtered.map(w => {
          const status = getStatusFromScore(w.timesSeen, w.correctCount ?? 0);
          return (
          <div key={w.word} className="ui-card" style={{ borderLeft: w.usedByUser ? "3px solid var(--green)" : "3px solid var(--accent)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <VocabIcon
              word={w.word}
              status={status}
              size={44}
              showBadge={false}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontFamily: "var(--font-serif)", color: "var(--text)", marginBottom: 3 }}>{w.word}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                {w.timesSeen}× gehört · zuletzt {new Date(w.lastSeen).toLocaleDateString("de-DE")}
              </div>
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden", width: "100%" }}>
                <div style={{ height: "100%", borderRadius: 2, background: w.usedByUser ? "var(--green)" : "var(--accent)", width: `${Math.min(100, w.timesSeen * 20)}%`, transition: "width 0.3s" }} />
              </div>
              <button onClick={() => fetchSentences(w.word)} style={{
                marginTop: 8, fontSize: 10, color: "var(--accent)",
                background: "none", border: "0.5px solid var(--accent-dim)",
                borderRadius: 4, padding: "2px 8px", cursor: "pointer",
                fontFamily: "var(--font-mono)"
              }}>
                {loadingSentences === w.word ? "..." : expandedWord === w.word ? "▲ Beispiele" : "▼ Beispiele"}
              </button>

              {expandedWord === w.word && sentences[w.word] && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--bg)", borderRadius: 6, border: "0.5px solid var(--border)" }}>
                  {sentences[w.word].map((s, i) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: i > 0 ? "6px 0 0" : 0, fontStyle: "italic" }}>
                      "{s}"
                    </p>
                  ))}

                  {showTranslation[w.word] && translations[w.word] && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
                      {translations[w.word].map((t, i) => (
                        <p key={i} style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, margin: i > 0 ? "4px 0 0" : 0 }}>
                          {i + 1}. {t}
                        </p>
                      ))}
                    </div>
                  )}

                  <button onClick={() => fetchTranslations(w.word)} style={{
                    marginTop: 10, fontSize: 10, color: "var(--text-muted)",
                    background: "none", border: "0.5px solid var(--border)",
                    borderRadius: 4, padding: "2px 10px", cursor: "pointer",
                    fontFamily: "var(--font-mono)", display: "block"
                  }}>
                    {loadingTranslations === w.word ? "..." : showTranslation[w.word] ? "DE verbergen" : "EN anzeigen"}
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, background: w.usedByUser ? "rgba(39,174,96,0.15)" : "var(--accent-glow)", color: w.usedByUser ? "var(--green)" : "var(--accent)", border: `0.5px solid ${w.usedByUser ? "rgba(39,174,96,0.4)" : "var(--accent-dim)"}`, whiteSpace: "nowrap" }}>
              {w.usedByUser ? "Gelernt ✓" : "Neu"}
            </div>
          </div>
          );
        })}
      </div>
          </>
        )}

        {view === "karriere" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Berufsvokabel suchen..."
                className="ui-card"
                style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--border-light)", color: "var(--text)", fontSize: 15, fontFamily: "var(--font-sans)", outline: "none" }}
              />
            </div>
            {careerLoading && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Lädt...</p>}
            {!careerLoading && !careerAvailable && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>
                Karriere-Vokabeln sind auf diesem Branch noch nicht verfügbar.
              </p>
            )}
            {!careerLoading && careerAvailable && filteredCareer.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>Keine Einträge gefunden.</p>
            )}
            {!careerLoading && filteredCareer.map(entry => (
              <div
                key={entry.id}
                className="ui-card ui-card-padded"
                style={{ marginBottom: 8 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontFamily: "var(--font-serif)", color: "var(--text)" }}>{entry.text}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 10,
                      color: careerStatusColor(entry.status),
                      border: `0.5px solid ${careerStatusColor(entry.status)}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.status === "used" ? "Gesagt" : entry.status === "exposed" ? "Gehört" : "Neu"}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>{entry.english}</p>
                <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{entry.category}</span>
              </div>
            ))}
          </>
        )}
          </>
        )}
      </div>
  );
}
