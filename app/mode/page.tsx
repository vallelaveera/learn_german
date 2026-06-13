"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { LevelChip } from "@/components/level/LevelChip";
import { HomeIllustration } from "@/components/illustrations/HomeIllustration";
import { ActivityCard } from "@/components/ui/ActivityCard";
import {
  CallActivityIcon,
  GrammarActivityIcon,
  SentencesActivityIcon,
  WordsActivityIcon,
} from "@/components/ui/ActivityIcons";
import { normalizeGermanLevel, type GermanLevel } from "@/lib/levels";
import { BetaWelcomeModal } from "@/components/feedback/BetaWelcomeModal";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import { hasSeenBetaWelcome } from "@/lib/feedback/storage";

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
  const [recentMistakes, setRecentMistakes] = useState<string[]>([]);
  const [betaWelcomeOpen, setBetaWelcomeOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
          if (!hasSeenBetaWelcome()) setBetaWelcomeOpen(true);
        }
      });

    fetch("/api/exercises/status", { cache: "no-store" })
      .then(r => (r.status === 401 ? null : r.ok ? r.json() : null))
      .then(d => {
        if (d?.germanLevel) setLevel(normalizeGermanLevel(d.germanLevel));
      });

    fetch("/api/vocab", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.words?.length) return;
        const mistakes = (d.words as Array<{
          word?: string;
          text?: string;
          correctCount?: number;
          timesSeen?: number;
          seenCount?: number;
        }>)
          .filter(w => {
            const seen = w.timesSeen ?? w.seenCount ?? 0;
            const correct = w.correctCount ?? 0;
            return seen > 0 && correct < seen;
          })
          .slice(0, 5)
          .map(w => w.word ?? w.text ?? "")
          .filter(Boolean);
        setRecentMistakes(mistakes);
      })
      .catch(() => {});

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
      fitViewport
      headerRight={<LevelChip currentLevel={level} onSelect={saveLevel} />}
      minimalHeader
    >
      <div className="ui-page ui-page-home">
        <div className="ui-hero animate-fade-in">
          <div
            className="ui-home-hero-inner"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 12, position: "relative", zIndex: 1 }}
          >
            <div style={{ textAlign: "center" }}>
              <h1 className="ui-title-serif" style={{ fontSize: 20, marginBottom: 4 }}>
                {user ? `Hey ${user.name}!` : "Hey!"}
              </h1>
              <p className="ui-muted" style={{ margin: 0, fontSize: 12 }}>
                Wie möchtest du heute Deutsch üben?
              </p>
            </div>
            <HomeIllustration
              width={284}
              height={178}
              userLevel={level}
              recentMistakes={recentMistakes}
              userName={user?.name}
            />
          </div>
        </div>

        <div className="ui-home-cards">
          <ActivityCard
            compact
            tone="orange"
            icon={<CallActivityIcon color="#FF6B35" />}
            label="Mit Maya sprechen"
            subtext="Freisprechen — wie ein echtes Gespräch"
            onClick={() => {
              localStorage.setItem("maya_voice", "soniox");
              router.push("/call");
            }}
          />
          <ActivityCard
            compact
            tone="green"
            icon={<GrammarActivityIcon color="#38A169" />}
            label="Grammatik üben"
            subtext="Themen nach Level · Mit Maya sprechen"
            onClick={() => router.push("/grammar")}
          />
          <ActivityCard
            compact
            tone="purple"
            icon={<SentencesActivityIcon color="#805AD5" />}
            label="Sätze üben"
            subtext="Themen wählen · Satzbau mit Maya"
            onClick={() => router.push("/exercises/sentences")}
          />
          <ActivityCard
            compact
            tone="blue"
            icon={<WordsActivityIcon color="#4A90E2" />}
            label="Wörter üben"
            subtext="Kategorien · Flashcards mit Maya"
            onClick={() => router.push("/exercises/words")}
          />
        </div>

        <div className="ui-home-footer">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              border: "1px solid rgba(127, 119, 221, 0.45)",
              background: "rgba(127, 119, 221, 0.1)",
              color: "#534AB7",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Feedback geben · Give feedback
          </button>
        </div>
      </div>

      <BetaWelcomeModal
        open={betaWelcomeOpen}
        onClose={() => setBetaWelcomeOpen(false)}
        onGiveFeedback={() => setFeedbackOpen(true)}
      />
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} source="home" />
    </PageShell>
  );
}
