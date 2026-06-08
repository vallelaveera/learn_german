"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Session, Message } from "@/lib/types";
import styles from "./history.module.css";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions ?? []);
        setLoading(false);
      });
  }, []);

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((s) => s.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const duration = (s: Session) => {
    if (!s.endedAt) return "—";
    const secs = Math.round((s.endedAt - s.startedAt) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.round(secs / 60)}min`;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>Deutsch Tutor</span>
        </div>
        <Link href="/call" className={styles.backBtn}>
          ← Zurück zum Üben
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Gespräche</h2>
          {loading && <p className={styles.empty}>Lädt...</p>}
          {!loading && sessions.length === 0 && (
            <p className={styles.empty}>
              Noch keine Gespräche gespeichert.<br />
              <Link href="/call" style={{ color: "var(--accent)" }}>
                Jetzt üben →
              </Link>
            </p>
          )}
          <div className={styles.sessionList}>
            {sessions.map((s) => (
              <button
                key={s.id}
                className={`${styles.sessionItem} ${
                  selected?.id === s.id ? styles.sessionItemActive : ""
                }`}
                onClick={() => setSelected(s)}
              >
                <div className={styles.sessionTop}>
                  <span className={styles.sessionDate}>{formatDate(s.startedAt)}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => deleteSession(s.id, e)}
                    title="Löschen"
                  >
                    ×
                  </button>
                </div>
                <p className={styles.sessionTitle}>{s.title ?? "Gespräch"}</p>
                <div className={styles.sessionMeta}>
                  <span>{s.messages.length} Nachrichten</span>
                  <span>{duration(s)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.detail}>
          {!selected ? (
            <div className={styles.detailEmpty}>
              <p>← Gespräch auswählen</p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <h3 className={styles.detailTitle}>{selected.title}</h3>
                <span className={styles.detailDate}>{formatDate(selected.startedAt)}</span>
              </div>
              <div className={styles.messages}>
                {selected.messages.map((msg: Message, i: number) => (
                  <div
                    key={i}
                    className={`${styles.bubble} ${
                      msg.role === "user" ? styles.userBubble : styles.assistantBubble
                    }`}
                  >
                    <div className={styles.bubbleRole}>
                      {msg.role === "user" ? "Du" : "Maya"}
                    </div>
                    <p className={styles.bubbleText}>{msg.content}</p>
                    {msg.translation && (
                      <p className={styles.bubbleHint}>💡 {msg.translation}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
