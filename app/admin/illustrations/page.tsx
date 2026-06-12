"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SentenceCard } from "@/components/illustrations/SentenceCard";
import { AdminCard, AdminStatGrid } from "@/components/admin/AdminShell";
import type {
  CategoryStats,
  IllustrationBatchResult,
  SentenceIllustrationRow,
} from "@/lib/content/illustration-batch";
import { isDevAdminFeaturesEnabled } from "@/lib/dev-admin-features";
import { ILLUSTRATION_BATCH_LIMIT } from "@/lib/content/illustration-lookup";

const PURPLE = "#7F77DD";

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      text.trim().startsWith("<")
        ? `Server error (HTTP ${res.status}) — request may have timed out. Try again; max ${ILLUSTRATION_BATCH_LIMIT} per batch.`
        : text.slice(0, 160) || `HTTP ${res.status}`,
    );
  }
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  generated: { bg: "#EAF3DE", color: "#27500A", label: "Generated" },
  placeholder: { bg: "#FAEEDA", color: "#633806", label: "Placeholder" },
  missing: { bg: "#F1EFE8", color: "#888780", label: "Missing" },
};

export default function AdminIllustrationsPage() {
  const router = useRouter();
  const isDev = isDevAdminFeaturesEnabled();

  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("transport");
  const [sentences, setSentences] = useState<SentenceIllustrationRow[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retry, setRetry] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<IllustrationBatchResult | null>(null);
  const [error, setError] = useState("");

  const loadCategory = useCallback(async (category: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/illustrations?category=${encodeURIComponent(category)}`);
      if (res.status === 401) {
        router.push("/mode");
        return;
      }
      if (res.status === 404) {
        setError("Illustrations admin is dev-only.");
        return;
      }
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(String(data.error ?? "Failed to load"));
      setCategories((data.categories as CategoryStats[]) ?? []);
      setSentences((data.sentences as SentenceIllustrationRow[]) ?? []);
      setStats((data.stats as CategoryStats) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isDev) return;
    void loadCategory(selectedCategory);
  }, [isDev, selectedCategory, loadCategory]);

  async function runGeneration() {
    setRunning(true);
    setLogs([]);
    setLastResult(null);
    setError("");

    try {
      const res = await fetch("/api/admin/illustrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          retry,
          limit: ILLUSTRATION_BATCH_LIMIT,
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(String(data.error ?? "Generation failed"));

      const result = data.result as IllustrationBatchResult;
      setLastResult(result);
      setLogs(result?.logs ?? []);
      setSentences((data.sentences as SentenceIllustrationRow[]) ?? []);
      setStats((data.stats as CategoryStats) ?? null);
      if (data.categories) setCategories(data.categories as CategoryStats[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  if (!isDev) {
    return (
      <AdminCard>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Sentence illustration generation is only available in development.
        </p>
      </AdminCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <AdminCard>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Generate animated Maya SVGs per category via Claude Haiku. On Vercel, SVGs are stored in Redis (
          <code>KV_REST_API_URL</code>); locally they also save to <code>data/illustrations/</code>.
          Includes batch sentences plus matching flashcard/corpus entries.
          Generates up to <strong>{ILLUSTRATION_BATCH_LIMIT}</strong> SVGs per click — click again until done.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 180 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Category
            </span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              disabled={running}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                fontSize: 13,
              }}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.generated}/{c.total} generated)
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", paddingBottom: 10 }}>
            <input
              type="checkbox"
              checked={retry}
              onChange={e => setRetry(e.target.checked)}
              disabled={running}
            />
            Retry placeholders only
          </label>

          <button
            type="button"
            onClick={() => void runGeneration()}
            disabled={running || loading}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: PURPLE,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: running ? "wait" : "pointer",
              opacity: running || loading ? 0.7 : 1,
            }}
          >
            {running ? `Generating (${ILLUSTRATION_BATCH_LIMIT} max)…` : `Generate next ${ILLUSTRATION_BATCH_LIMIT}`}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--red)", marginTop: 12 }}>{error}</p>
        )}
      </AdminCard>

      {stats && (
        <AdminStatGrid stats={[
          { label: "Total", value: stats.total },
          { label: "Generated", value: stats.generated, accent: "#1D9E75" },
          { label: "Placeholder", value: stats.placeholder, accent: "#EF9F27" },
          { label: "Missing", value: stats.missing },
        ]} />
      )}

      {lastResult && (
        <AdminCard>
          <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Batch complete — generated {lastResult.generated}, skipped {lastResult.skipped}, failed {lastResult.failed}.
            Est. cost ${lastResult.costEstimate}
            {lastResult.hasMore && (
              <> · <strong>{lastResult.pending}</strong> still pending — click &quot;Generate next {ILLUSTRATION_BATCH_LIMIT}&quot; again.</>
            )}
          </p>
        </AdminCard>
      )}

      {logs.length > 0 && (
        <AdminCard>
          <pre style={{
            margin: 0,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            whiteSpace: "pre-wrap",
            maxHeight: 200,
            overflow: "auto",
          }}>
            {logs.join("\n")}
          </pre>
        </AdminCard>
      )}

      <AdminCard>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Sentences
        </div>
        {loading ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "8px 6px" }}>ID</th>
                  <th style={{ padding: "8px 6px" }}>German</th>
                  <th style={{ padding: "8px 6px" }}>Level</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px" }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {sentences.map(row => {
                  const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.missing;
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 6px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{row.id}</td>
                      <td style={{ padding: "8px 6px", maxWidth: 220 }}>{row.de}</td>
                      <td style={{ padding: "8px 6px" }}>{row.level}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: st.bg,
                          color: st.color,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "8px 6px", color: "var(--text-muted)" }}>
                        {row.charCount > 0 ? `${row.charCount} chars` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {sentences.some(s => s.status === "generated") && (
        <AdminCard>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Preview
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}>
            {sentences
              .filter(s => s.status === "generated")
              .map(s => (
                <SentenceCard
                  key={s.id}
                  sentenceId={s.id}
                  de={s.de}
                  en={s.en}
                  level={s.level}
                />
              ))}
          </div>
        </AdminCard>
      )}
    </div>
  );
}
