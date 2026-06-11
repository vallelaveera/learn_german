"use client";
import { Suspense, useState, useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { LevelStrip } from "@/components/level/LevelStrip";
import { normalizeGermanLevel, type GermanLevel } from "@/lib/levels";

const PURPLE = "#7F77DD";

function IconPhone() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function IconWriting() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconBooks() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

interface HomeButtonProps {
  primary?: boolean;
  icon: ReactNode;
  label: string;
  subtext: string;
  onClick: () => void;
}

function HomeButton({ primary, icon, label, subtext, onClick }: HomeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 64,
        padding: "14px 16px",
        borderRadius: 14,
        border: primary ? "none" : "0.5px solid var(--border)",
        background: primary ? PURPLE : "var(--surface)",
        color: primary ? "#fff" : "var(--text)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ color: primary ? "#fff" : PURPLE, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: primary ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}>
          {subtext}
        </span>
      </span>
    </button>
  );
}

export default function ModePage() {
  return (
    <Suspense fallback={null}>
      <ModePageInner />
    </Suspense>
  );
}

function ModePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ name: string; germanLevel?: string } | null>(null);
  const [level, setLevel] = useState<string>("A1");

  useEffect(() => {
    const urlLevel = searchParams.get("level");
    if (urlLevel) {
      setLevel(normalizeGermanLevel(urlLevel));
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(d => {
        if (d?.user) {
          setUser(d.user);
          setLevel(normalizeGermanLevel(d.user.germanLevel));
        }
      });

    fetch("/api/exercises/status", { cache: "no-store" })
      .then(r => (r.status === 401 ? null : r.ok ? r.json() : null))
      .then(d => {
        if (d && !d.placementDone) router.push("/exercises/placement");
        else if (d?.germanLevel) setLevel(normalizeGermanLevel(d.germanLevel));
      });

    if (urlLevel) {
      router.replace("/mode", { scroll: false });
    }
  }, [router, searchParams]);

  const saveLevel = async (next: GermanLevel) => {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ germanLevel: next }),
    });
    if (res.ok) setLevel(next);
  };

  return (
    <PageShell showTabBar>
      <div style={{ padding: "16px 18px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <LevelStrip currentLevel={level} onSelect={saveLevel} />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.45, textAlign: "center" }}>
            Nach ein paar Gesprächen empfehlen wir dir das beste Level.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
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
          <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            {user ? `Hey ${user.name}!` : "Hey!"} Wie möchtest du heute üben?
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <HomeButton
            primary
            icon={<IconPhone />}
            label="Mit Maya üben"
            subtext="Sprich direkt mit Maya"
            onClick={() => {
              localStorage.setItem("maya_voice", "soniox");
              router.push("/call");
            }}
          />
          <HomeButton
            icon={<IconWriting />}
            label="Sätze üben"
            subtext="Lerne neue Sätze"
            onClick={() => router.push("/exercises/sentences")}
          />
          <HomeButton
            icon={<IconBooks />}
            label="Wörter üben"
            subtext="Übe deine Vokabeln"
            onClick={() => router.push("/exercises/words")}
          />
        </div>
      </div>
    </PageShell>
  );
}
