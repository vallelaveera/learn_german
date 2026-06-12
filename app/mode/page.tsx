"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { LevelChip } from "@/components/level/LevelChip";
import { PracticeJourneyMap } from "@/components/home/PracticeJourneyMap";
import { MayaAvatar } from "@/components/ui/MayaAvatar";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { normalizeGermanLevel, type GermanLevel } from "@/lib/levels";

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
    <PageShell
      showTabBar
      headerRight={<LevelChip currentLevel={level} onSelect={saveLevel} />}
      minimalHeader
    >
      <div className="ui-page">
        <div className="ui-hero animate-fade-in">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 22, position: "relative", zIndex: 1 }}>
            <MayaAvatar size={88} decorative />
            <div style={{ textAlign: "center" }}>
              <h1 className="ui-title-serif" style={{ fontSize: 24, marginBottom: 6 }}>
                {user ? `Hey ${user.name}!` : "Hey!"}
              </h1>
              <p className="ui-muted" style={{ margin: 0 }}>
                Wie möchtest du heute Deutsch üben?
              </p>
            </div>
          </div>

          <ActivityCard
            primary
            tone="orange"
            emoji="📞"
            icon={<Phone size={22} color="#fff" strokeWidth={2} />}
            label="Mit Maya sprechen"
            subtext="Freisprechen — wie ein echtes Gespräch"
            onClick={() => {
              localStorage.setItem("maya_voice", "soniox");
              router.push("/call");
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ActivityCard
            tone="purple"
            emoji="🧩"
            label="Sätze üben"
            subtext="Themen wählen · Satzbau mit Maya"
            onClick={() => router.push("/exercises/sentences")}
          />
          <ActivityCard
            tone="blue"
            emoji="📚"
            label="Wörter üben"
            subtext="Kategorien · Flashcards mit Maya"
            onClick={() => router.push("/exercises/words")}
          />
        </div>

        <PracticeJourneyMap />
      </div>
    </PageShell>
  );
}
