"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(d => {
        if (!d) return;
        setUser(d.user);
        setName(d.user.name);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const facts = user?.facts ?? {};

  return (
    <PageShell title="Profil">
      {loading ? <p style={{ padding: 24, color: "var(--text-muted)" }}>Lädt...</p> : (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #7c4daa, #e8643a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "#fff" }}>{name[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)" }}>{user.name}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{user.email}</p>
            </div>
          </div>

          {/* Edit name */}
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Name</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)" }}
              />
              <button onClick={save} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #7c4daa, #e8643a)", borderRadius: 6, color: "#fff", fontSize: 13, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                {saved ? "✓" : "Speichern"}
              </button>
            </div>
          </div>

          {/* What Maya knows — only safe fields */}
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Dein Lernprofil</p>
            {[
              { key: "nativeLanguage", label: "Muttersprache" },
              { key: "germanWhy", label: "Warum Deutsch" },
              { key: "occupation", label: "Beruf" },
              { key: "interests", label: "Interessen" },
            ]
              .filter(({ key }) => facts[key])
              .map(({ key, label }) => (
                <div key={key} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", minWidth: 110 }}>{label}</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>
                    {Array.isArray(facts[key]) ? (facts[key] as string[]).join(", ") : String(facts[key])}
                  </span>
                </div>
              ))}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Sessions", value: user.totalSessions ?? 0 },
              { label: "Streak", value: `🔥 ${user.streak ?? 0}` },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: "#7c4daa" }}>{s.value}</div>
              </div>
            ))}
          </div>

          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
            style={{ padding: "12px", borderRadius: 10, border: "0.5px solid var(--border)", background: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
            Logout
          </button>
        </div>
      )}
    </PageShell>
  );
}
