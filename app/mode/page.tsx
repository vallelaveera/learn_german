"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ModePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; totalSessions: number } | null>(null);
  const [homeworkPending, setHomeworkPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(d => { if (d?.user) setUser(d.user); });
    fetch("/api/homework")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.assignment && d?.progress && d.progress.completedReps < d.progress.totalReps) {
          setHomeworkPending(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--accent)", color: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>DE</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 300, color: "var(--text)" }}>CallMeDaily</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
          {user ? `Hey ${user.name}!` : "Hey!"} Wie möchtest du heute üben?
        </p>
      </div>

      {/* Maya avatar */}
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40, position: "relative" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--accent)" }}>M</span>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--bg)" }} />
      </div>

      {/* Mode cards */}
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Call mode — two voice options */}
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            📞 Call Mode — Stimme wählen
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {/* Maya Classic — Soniox */}
            <button
              onClick={() => { localStorage.setItem("maya_voice", "soniox"); router.push("/callmode"); }}
              style={{
                flex: 1, padding: "16px 12px", borderRadius: 14,
                background: "var(--surface)", border: "1px solid var(--border)",
                cursor: "pointer", textAlign: "center",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎙️</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4, fontFamily: "var(--font-serif)" }}>Maya A</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Classic</div>
            </button>

            {/* Maya Natural — Fish Audio */}
            <button
              onClick={() => { localStorage.setItem("maya_voice", "fish"); router.push("/callmode"); }}
              style={{
                flex: 1, padding: "16px 12px", borderRadius: 14,
                background: "linear-gradient(135deg, rgba(124,77,170,0.08), rgba(232,100,58,0.08))",
                border: "1px solid rgba(124,77,170,0.3)",
                cursor: "pointer", textAlign: "center",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#7c4daa", marginBottom: 4, fontFamily: "var(--font-serif)" }}>Maya B</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)"}}>Natural</div>
            </button>
          </div>
        </div>

        {/* Practice mode */}
        <button
          onClick={() => router.push("/practice")}
          style={{
            width: "100%", padding: "20px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(232,100,58,0.06), rgba(124,77,170,0.06))",
            border: "1px solid rgba(232,100,58,0.3)",
            cursor: "pointer", textAlign: "left",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(232,100,58,0.1)", border: "1px solid rgba(232,100,58,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
              🎭
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#e8643a", fontFamily: "var(--font-serif)" }}>Üben</span>
                <span style={{ fontSize: 10, background: "rgba(232,100,58,0.1)", color: "#e8643a", border: "0.5px solid rgba(232,100,58,0.3)", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.06em" }}>ROLLENSPIEL</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Bäckerei, Café, Bahnhof — übe echte Situationen Schritt für Schritt.</div>
            </div>
            <span style={{ color: "#e8643a", fontSize: 18 }}>→</span>
          </div>
        </button>

        {/* Manual mode */}
        <button
          onClick={() => router.push("/call")}
          style={{
            width: "100%", padding: "20px", borderRadius: 14,
            background: "var(--surface)", border: "1px solid var(--border)",
            cursor: "pointer", textAlign: "left",
            WebkitTapHighlightColor: "transparent",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 4, fontFamily: "var(--font-serif)" }}>Manual</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Drücke den Knopf zum Sprechen. Du kontrollierst wann Maya antwortet.</div>
            </div>
            <span style={{ color: "var(--text-dim)", fontSize: 18 }}>→</span>
          </div>
        </button>
      </div>

      {/* Bottom tab bar */}
      <div style={{ display: "flex", gap: 8, marginTop: 32, width: "100%", maxWidth: 360 }}>
        {[
          { href: "/homework", label: "Hausaufg.", icon: "📋" },
          { href: "/words", label: "Wörter", icon: "📚" },
          { href: "/progress", label: "Fortschritt", icon: "📈" },
          { href: "/history", label: "Verlauf", icon: "🕐" },
          { href: "/profile", label: "Profil", icon: "👤" },
        ].map(l => (
          <a key={l.href} href={l.href} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, padding: "10px 4px", borderRadius: 12,
            background: "var(--surface)", border: "0.5px solid var(--border)",
            textDecoration: "none", position: "relative",
          }}>
            <span style={{ fontSize: 18 }}>{l.icon}</span>
            {l.href === "/homework" && homeworkPending && (
              <span style={{ position: "absolute", top: 6, right: 8, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
            )}
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{l.label}</span>
          </a>
        ))}
      </div>

      <button
        onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
        style={{ marginTop: 16, fontSize: 11, color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
      >
        Logout
      </button>
    </div>
  );
}
