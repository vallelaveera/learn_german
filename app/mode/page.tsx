"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";

export default function ModePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [homeworkPending, setHomeworkPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(d => { if (d?.user) setUser(d.user); });
    fetch("/api/exercises/status")
      .then(r => (r.status === 401 ? null : r.ok ? r.json() : null))
      .then(d => { if (d && !d.placementDone) router.push("/exercises/placement"); });
    fetch("/api/homework")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.assignment && d?.progress && d.progress.completedReps < d.progress.totalReps) {
          setHomeworkPending(true);
        }
      })
      .catch(() => {});
  }, [router]);

  return (
    <PageShell title="Home">
      <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
          {user ? `Hey ${user.name}!` : "Hey!"} Wie möchtest du heute üben?
        </p>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--surface)",
            border: "2px solid var(--accent-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            position: "relative",
          }}
        >
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--accent)" }}>M</span>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--green)",
              border: "2px solid var(--bg)",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            localStorage.setItem("maya_voice", "soniox");
            router.push("/call");
          }}
          style={{
            width: "100%",
            minHeight: 52,
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: "#7F77DD",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            marginBottom: 12,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Jetzt anrufen
        </button>

        <Link
          href="/exercises/warmup?next=%2Fcall"
          style={{
            width: "100%",
            minHeight: 44,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
            fontFamily: "var(--font-mono)",
          }}
        >
          Kurzes Warmup →
        </Link>

        <Link
          href="/exercises/sentences"
          style={{
            width: "100%",
            minHeight: 48,
            padding: "14px 16px",
            borderRadius: 12,
            border: "0.5px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            marginBottom: 12,
          }}
        >
          <span>🧩 Satzbau</span>
          <span>→</span>
        </Link>

        {homeworkPending && (
          <Link
            href="/homework"
            style={{
              width: "100%",
              minHeight: 44,
              padding: "12px 16px",
              borderRadius: 12,
              border: "0.5px solid var(--accent-dim)",
              background: "var(--accent-glow)",
              color: "var(--accent)",
              fontSize: 13,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
            }}
          >
            📋 Hausaufgaben offen
          </Link>
        )}
      </div>
    </PageShell>
  );
}
