"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, FileText, X } from "lucide-react";
import { downloadPracticeReportPdf } from "@/lib/exercises/session-report-pdf";
import type {
  PracticeSessionReport,
  SessionReportItem,
  SessionReportMeta,
} from "@/lib/exercises/session-report-types";

interface SessionReportActionsProps {
  meta: SessionReportMeta;
  score: number;
  total: number;
  items: SessionReportItem[];
  startedAt: number;
}

export function SessionReportActions({
  meta,
  score,
  total,
  items,
  startedAt,
}: SessionReportActionsProps) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endedAtRef = useRef(Date.now());

  const report = useMemo(
    (): Omit<PracticeSessionReport, "id" | "userId"> => ({
      type: meta.type,
      category: meta.category,
      title: meta.title,
      startedAt,
      endedAt: endedAtRef.current,
      score,
      total,
      items,
    }),
    [meta, score, total, items, startedAt],
  );

  const saveReport = useCallback(async (): Promise<PracticeSessionReport | null> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/exercises/session-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (res.status === 401) {
        setError("Bitte einloggen, um Berichte zu speichern.");
        return null;
      }
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { report?: PracticeSessionReport };
      if (data.report?.id) {
        setSavedId(data.report.id);
        return data.report;
      }
      return null;
    } catch {
      setError("Bericht konnte nicht gespeichert werden.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [report]);

  useEffect(() => {
    void saveReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save once when session ends
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      let full: PracticeSessionReport | null = savedId
        ? {
            ...report,
            id: savedId,
            userId: "",
          }
        : null;

      if (!full) {
        full = await saveReport();
      }

      if (!full) return;
      await downloadPracticeReportPdf(full);
    } catch {
      setError("PDF konnte nicht erstellt werden.");
    } finally {
      setDownloading(false);
    }
  };

  const correctItems = items.filter(i => i.correct);
  const wrongItems = items.filter(i => !i.correct);

  return (
    <div style={{ width: "100%", maxWidth: 360, marginTop: 8 }}>
      <div
        className="ui-card ui-card-padded"
        style={{ textAlign: "left", marginBottom: 10 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <FileText size={18} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Übungsbericht</span>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
          {correctItems.length} richtig · {wrongItems.length} zum Wiederholen
          {savedId ? " · im Profil gespeichert" : saving ? " · wird gespeichert…" : ""}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="ui-btn-primary"
            onClick={() => void handleDownload()}
            disabled={downloading || !items.length}
            style={{ fontSize: 14, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Download size={16} />
            {downloading ? "PDF wird erstellt…" : "PDF herunterladen"}
          </button>
          <button
            type="button"
            className="ui-btn-ghost"
            onClick={() => setExpanded(v => !v)}
            style={{ fontSize: 13, minHeight: 40, justifyContent: "center" }}
          >
            {expanded ? "Zusammenfassung ausblenden" : "Zusammenfassung anzeigen"}
          </button>
          <Link
            href="/profile"
            className="ui-btn-ghost"
            style={{ fontSize: 13, minHeight: 40, justifyContent: "center", textDecoration: "none" }}
          >
            Berichte im Profil
          </Link>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "#DC2626", margin: "10px 0 0" }}>{error}</p>
        )}
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
          {correctItems.length > 0 && (
            <ReportItemGroup title="Richtig" items={correctItems} accent="#1D9E75" />
          )}
          {wrongItems.length > 0 && (
            <ReportItemGroup title="Noch üben" items={wrongItems} accent="#DC2626" />
          )}
        </div>
      )}
    </div>
  );
}

function ReportItemGroup({
  title,
  items,
  accent,
}: {
  title: string;
  items: SessionReportItem[];
  accent: string;
}) {
  return (
    <div className="ui-card ui-card-padded" style={{ textAlign: "left" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: accent, margin: "0 0 8px" }}>{title}</p>
      {items.map((item, i) => (
        <div
          key={`${title}-${i}-${item.prompt.slice(0, 24)}`}
          style={{
            padding: "8px 0",
            borderTop: i ? "1px solid var(--border-light)" : undefined,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            {item.correct ? (
              <Check size={14} color="#1D9E75" style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <X size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{item.prompt}</p>
              {item.english && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{item.english}</p>
              )}
              {!item.correct && item.userAnswer && (
                <p style={{ fontSize: 12, color: "#DC2626", margin: "4px 0 0" }}>
                  Deine Antwort: {item.userAnswer}
                </p>
              )}
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Richtig: <strong style={{ color: "var(--text)" }}>{item.correctAnswer}</strong>
              </p>
              {item.explanation && (
                <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0 0", lineHeight: 1.45 }}>
                  {item.explanation}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
