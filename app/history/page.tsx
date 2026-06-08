"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Session, VocabWord } from "@/lib/types";
import styles from "./history.module.css";

type Tab = "sessions" | "vocab";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("sessions");

  useEffect(() => {
    Promise.all([
      fetch("/api/sessions").then(r => r.json()),
      fetch("/api/vocab").then(r => r.json()),
    ]).then(([s, v]) => {
      setSessions(s.sessions ?? []);
      setVocab(v.words ?? []);
      setLoading(false);
    });
  }, []);

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions(s => s.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("de-DE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const duration = (s: Session) => {
    if (!s.endedAt) return "—";
    const secs = Math.round((s.endedAt - s.startedAt) / 1000);
    return secs < 60 ? `${secs}s` : `${Math.round(secs / 60)}min`;
  };

  const totalNewWords = sessions.reduce((a, s) => a + (s.newWords?.length ?? 0), 0);
  const totalMessages = sessions.reduce((a, s) => a + (s.totalMessages ?? 0), 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>Deutsch Tutor</span>
        </div>
        <Link href="/call" className={styles.backBtn}>← Zurück zum Üben</Link>
      </header>

      {/* Stats bar */}
      <div style={{display:'flex',gap:12,padding:'16px 24px',borderBottom:'1px solid var(--border)'}}>
        {[
          { label: 'Gespräche', value: sessions.length },
          { label: 'Nachrichten', value: totalMessages },
          { label: 'Neue Wörter', value: totalNewWords },
          { label: 'Vokabeln gesamt', value: vocab.length },
        ].map(s => (
          <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 16px',flex:1}}>
            <div style={{fontSize:10,color:'var(--text-muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:500,color:'var(--accent)'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',padding:'0 24px'}}>
        {(['sessions','vocab'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'12px 16px', fontSize:12, letterSpacing:'0.06em',
            textTransform:'uppercase', cursor:'pointer', background:'none', border:'none',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily:'var(--font-mono)',
          }}>
            {t === 'sessions' ? `Gespräche (${sessions.length})` : `Vokabeln (${vocab.length})`}
          </button>
        ))}
      </div>

      <main className={styles.main}>
        {tab === 'sessions' && (
          <>
            <div className={styles.sidebar}>
              <h2 className={styles.sidebarTitle}>Gespräche</h2>
              {loading && <p className={styles.empty}>Lädt...</p>}
              {!loading && sessions.length === 0 && (
                <p className={styles.empty}>
                  Noch keine Gespräche.<br/>
                  <Link href="/call" style={{color:'var(--accent)'}}>Jetzt üben →</Link>
                </p>
              )}
              <div className={styles.sessionList}>
                {sessions.map(s => (
                  <button key={s.id}
                    className={`${styles.sessionItem} ${selected?.id === s.id ? styles.sessionItemActive : ''}`}
                    onClick={() => setSelected(s)}>
                    <div className={styles.sessionTop}>
                      <span className={styles.sessionDate}>{formatDate(s.startedAt)}</span>
                      <button className={styles.deleteBtn} onClick={e => deleteSession(s.id, e)}>×</button>
                    </div>
                    <p className={styles.sessionTitle}>{s.title ?? "Gespräch"}</p>
                    <div className={styles.sessionMeta}>
                      <span>{s.totalMessages ?? s.messages.length} Nachrichten</span>
                      <span>{duration(s)}</span>
                      {s.newWords && s.newWords.length > 0 && (
                        <span style={{color:'var(--accent)'}}>+{s.newWords.length} Wörter</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.detail}>
              {!selected ? (
                <div className={styles.detailEmpty}><p>← Gespräch auswählen</p></div>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <h3 className={styles.detailTitle}>{selected.title}</h3>
                    <span className={styles.detailDate}>{formatDate(selected.startedAt)}</span>
                  </div>

                  {selected.newWords && selected.newWords.length > 0 && (
                    <div style={{marginBottom:24}}>
                      <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:10}}>
                        Neue Wörter aus diesem Gespräch
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {selected.newWords.map(w => (
                          <span key={w} style={{
                            background:'var(--accent-glow)',border:'1px solid var(--accent-dim)',
                            color:'var(--accent)',borderRadius:20,padding:'4px 12px',
                            fontSize:13,fontFamily:'var(--font-serif)'
                          }}>{w}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.messages}>
                    {selected.messages.map((msg, i) => (
                      <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
                        <div className={styles.bubbleRole}>{msg.role === 'user' ? 'Du' : 'Felix'}</div>
                        <p className={styles.bubbleText}>{msg.content}</p>
                        {msg.translation && <p className={styles.bubbleHint}>💡 {msg.translation}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {tab === 'vocab' && (
          <div style={{padding:24,flex:1,overflowY:'auto'}}>
            {vocab.length === 0 ? (
              <p style={{color:'var(--text-muted)',fontSize:13}}>
                Noch keine Vokabeln. Führ ein Gespräch und drücke Beenden.
              </p>
            ) : (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
                  {vocab.map(w => (
                    <div key={w.word} style={{
                      background:'var(--surface)',border:'1px solid var(--border)',
                      borderRadius:8,padding:'10px 14px',
                    }}>
                      <div style={{fontSize:16,fontFamily:'var(--font-serif)',color:'var(--text)',marginBottom:4}}>{w.word}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>
                        {w.timesSeen}× gesehen · zuletzt {new Date(w.lastSeen).toLocaleDateString('de-DE')}
                      </div>
                      <div style={{
                        marginTop:6,height:3,borderRadius:2,
                        background:'var(--border)',overflow:'hidden'
                      }}>
                        <div style={{
                          height:'100%',borderRadius:2,
                          background:'var(--accent)',
                          width:`${Math.min(100, w.timesSeen * 20)}%`
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
