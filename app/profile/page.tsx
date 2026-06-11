"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Check, Flame, MessageSquare } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { StatTile } from "@/components/ui/StatTile";

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
  }, [router]);

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

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "#fff" }}>
                {name[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{user.name}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{user.email}</p>
            </div>
          </div>

          <div className="ui-card ui-card-padded">
            <p className="ui-label" style={{ marginBottom: 10 }}>Name</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="ui-card"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid var(--border-light)",
                  color: "var(--text)",
                  fontSize: 15,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={save}
                className="ui-btn-primary"
                style={{ width: "auto", minHeight: 44, padding: "10px 18px", fontSize: 14 }}
              >
                {saved ? <Check size={16} /> : "Speichern"}
              </button>
            </div>
          </div>

          <div className="ui-card ui-card-padded">
            <p className="ui-label" style={{ marginBottom: 12 }}>Dein Lernprofil</p>
            {[
              { key: "nativeLanguage", label: "Muttersprache" },
              { key: "germanWhy", label: "Warum Deutsch" },
              { key: "occupation", label: "Beruf" },
              { key: "interests", label: "Interessen" },
            ]
              .filter(({ key }) => facts[key])
              .map(({ key, label }) => (
                <div key={key} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <span className="ui-label" style={{ minWidth: 110, marginBottom: 0 }}>{label}</span>
                  <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.4 }}>
                    {Array.isArray(facts[key]) ? (facts[key] as string[]).join(", ") : String(facts[key])}
                  </span>
                </div>
              ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatTile label="Sessions" value={user.totalSessions ?? 0} icon={<MessageSquare size={18} />} />
            <StatTile label="Streak" value={user.streak ?? 0} icon={<Flame size={18} />} accent="var(--green)" />
          </div>

          <button
            type="button"
            onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
            className="ui-btn-ghost"
            style={{ width: "100%", minHeight: 48, justifyContent: "center" }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </PageShell>
  );
}
