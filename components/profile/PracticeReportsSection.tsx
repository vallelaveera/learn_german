"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileText, Trash2 } from "lucide-react";
import { downloadPracticeReportPdf } from "@/lib/exercises/session-report-pdf";
import type { PracticeReportSummary, PracticeSessionReport } from "@/lib/exercises/session-report-types";

const TYPE_LABELS: Record<string, string> = {
  words: "Wörter",
  sentences: "Sätze",
  grammar: "Grammatik",
  gender: "Artikel",
};

export function PracticeReportsSection() {
  const [reports, setReports] = useState<PracticeReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PracticeSessionReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exercises/session-reports");
      if (!res.ok) return;
      const data = (await res.json()) as { reports?: PracticeReportSummary[] };
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const loadDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/exercises/session-reports?id=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { report?: PracticeSessionReport };
      setDetail(data.report ?? null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/exercises/session-reports?id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { report?: PracticeSessionReport };
    if (data.report) await downloadPracticeReportPdf(data.report);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/exercises/session-reports?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setReports(prev => prev.filter(r => r.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
    }
  };

  if (loading) {
    return (
      <div className="ui-card ui-card-padded">
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Übungsberichte werden geladen…</p>
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="ui-card ui-card-padded">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <FileText size={18} color="var(--accent)" />
          <p className="ui-label" style={{ margin: 0 }}>Übungsberichte</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
          Nach Wörter-, Satz- oder Grammatikübungen erscheint hier dein Bericht mit PDF-Download.
        </p>
      </div>
    );
  }

  return (
    <div className="ui-card ui-card-padded">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <FileText size={18} color="var(--accent)" />
        <p className="ui-label" style={{ margin: 0 }}>Übungsberichte</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {reports.map(report => {
          const pct = report.total ? Math.round((report.score / report.total) * 100) : 0;
          const open = expandedId === report.id;
          return (
            <div
              key={report.id}
              style={{
                border: "1px solid var(--border-light)",
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              <button
                type="button"
                onClick={() => void loadDetail(report.id)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{report.title}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {TYPE_LABELS[report.type] ?? report.type} · {report.score}/{report.total} ({pct}%) ·{" "}
                    {new Date(report.endedAt).toLocaleDateString("de-DE")}
                  </span>
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {open && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border-light)" }}>
                  {detailLoading || !detail ? (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "12px 0 0" }}>Lädt…</p>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
                        <button
                          type="button"
                          className="ui-btn-primary"
                          onClick={() => void handleDownload(report.id)}
                          style={{ flex: 1, fontSize: 13, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <Download size={14} />
                          PDF
                        </button>
                        <button
                          type="button"
                          className="ui-btn-ghost"
                          onClick={() => void handleDelete(report.id)}
                          style={{ minHeight: 40, padding: "0 12px" }}
                          aria-label="Bericht löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {[...detail.items.filter(i => !i.correct), ...detail.items.filter(i => i.correct)].map(
                        (item, i) => (
                          <div
                            key={`${report.id}-${i}`}
                            style={{
                              padding: "8px 0",
                              borderTop: i ? "1px solid var(--border-light)" : undefined,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                margin: "0 0 4px",
                                color: item.correct ? "#1D9E75" : "#DC2626",
                              }}
                            >
                              {item.correct ? "Richtig" : "Noch üben"}
                            </p>
                            <p style={{ fontSize: 13, margin: 0, lineHeight: 1.4 }}>{item.prompt}</p>
                            {item.english && (
                              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                                {item.english}
                              </p>
                            )}
                            {!item.correct && item.userAnswer && (
                              <p style={{ fontSize: 12, color: "#DC2626", margin: "4px 0 0" }}>
                                Deine Antwort: {item.userAnswer}
                              </p>
                            )}
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                              Richtig: {item.correctAnswer}
                            </p>
                            {item.explanation && (
                              <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0 0", lineHeight: 1.45 }}>
                                {item.explanation}
                              </p>
                            )}
                          </div>
                        ),
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
