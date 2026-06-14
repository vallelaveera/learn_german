"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GrammarCategoryGrid } from "@/components/grammar/catalog/GrammarCategoryGrid";
import { GrammarLevelTOC } from "@/components/grammar/catalog/GrammarLevelTOC";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import { defaultGrammarLevelId } from "@/lib/grammar/curriculum";
import {
  VERIFIED_LEVELS,
  levelColor,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import {
  getArticleTrainerHref,
  getDefaultArticleTrainerPointForLevel,
} from "@/lib/articles/scope";
import type { GrammarLevelId } from "@/lib/grammar/curriculum";

function mapToVerifiedLevel(levelId: GrammarLevelId): VerifiedLevel {
  return levelId;
}

export default function GrammarPage() {
  const router = useRouter();
  const [levelId, setLevelId] = useState<VerifiedLevel>("A1");
  const [tier, setTier] = useState<GrammarTier>("basic");
  const [levelReady, setLevelReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data?.user?.germanLevel) {
          setLevelId(mapToVerifiedLevel(defaultGrammarLevelId(data.user.germanLevel)));
        }
      })
      .finally(() => setLevelReady(true));
  }, [router]);

  const progress = useGrammarCatalogProgress(levelId, tier);
  const color = levelColor(levelId);
  const articleTablePointId = getDefaultArticleTrainerPointForLevel(levelId as GrammarLevelId);
  const articleTableHref = articleTablePointId
    ? getArticleTrainerHref(articleTablePointId, levelId as GrammarLevelId)
    : null;

  return (
    <PageShell showTabBar title="Grammatik">
      <div className="ui-page" style={{ paddingTop: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <p className="ui-muted" style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.5 }}>
            Wähle Level und Bereich — Basic oder Advanced pro Stufe.
          </p>
          <p style={{ fontSize: 12, color, margin: 0, fontWeight: 600 }}>
            CEFR {levelId}
            {!levelReady ? " · lädt..." : ""}
          </p>
        </div>

        <SegmentedTabs
          tabs={VERIFIED_LEVELS.map(id => ({ id, label: id }))}
          value={levelId}
          onChange={setLevelId}
        />

        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <SegmentedTabs
            tabs={[
              { id: "basic", label: "Basic" },
              { id: "advanced", label: "Advanced" },
            ]}
            value={tier}
            onChange={v => setTier(v as GrammarTier)}
          />
        </div>

        {progress.hydrated && (
          <>
            <GrammarLevelTOC level={levelId} tier={tier} progress={progress} />
            <GrammarCategoryGrid level={levelId} tier={tier} progress={progress} />
          </>
        )}

        {articleTableHref && (
          <Link
            href={articleTableHref}
            className="ui-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              marginBottom: 10,
              textDecoration: "none",
              border: `1px solid ${color}44`,
            }}
          >
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color }}>
                Artikel-Tabelle
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                Interaktive Deklination — bestehender Trainer
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>Öffnen →</span>
          </Link>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/mode" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            ← Zurück zur Startseite
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
