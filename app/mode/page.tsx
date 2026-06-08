"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ModePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(d => { if (d) setUser(d.user); });
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

        {/* Call mode - DEFAULT */}
        <button
          onClick={() => router.push("/callmode")}
          style={{
            width: "100%", padding: "20px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.03))",
            border: "1px solid var(--accent-dim)",
            cursor: "pointer", textAlign: "left",
            WebkitTapHighlightColor: "transparent",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "var(--accent)", fontFamily: "var(--font-serif)" }}>Call Mode</span>
                <span style={{ fontSize: 10, background: "var(--accent-glow)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.06em" }}>EMPFOHLEN</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Völlig freihändig. Ideal beim Spazieren, im Gym oder beim Pendeln.</div>
            </div>
            <span style={{ color: "var(--accent)", fontSize: 18 }}>→</span>
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

      {/* Bottom links */}
      <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
        {[
          { href: "/words", label: "Wörter" },
          { href: "/progress", label: "Fortschritt" },
          { href: "/profile", label: "Profil" },
          { href: "/history", label: "Verlauf" },
        ].map(l => (
          <a key={l.href} href={l.href} style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{l.label}</a>
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
