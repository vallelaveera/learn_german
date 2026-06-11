"use client";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FreisprechenCall } from "@/components/call/FreisprechenCall";
import { TippenCall } from "@/components/call/TippenCall";
import { CallReport } from "@/components/call/CallReport";
import { computeCallReportStats } from "@/lib/call-report-stats";
import { Message } from "@/lib/types";

type CallMode = "freisprechen" | "tippen";

function CallPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramMode = searchParams.get("mode");
  const [mode, setMode] = useState<CallMode>(paramMode === "tippen" ? "tippen" : "freisprechen");
  const [report, setReport] = useState<{ messages: Message[]; durationSec: number } | null>(null);

  const handleCallEnded = useCallback((messages: Message[], durationSec: number) => {
    setReport({ messages, durationSec });
  }, []);

  const switchMode = (next: CallMode) => {
    if (report) return;
    setMode(next);
    router.replace(next === "tippen" ? "/call?mode=tippen" : "/call?mode=freisprechen", { scroll: false });
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: 390,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {!report && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 18px",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            borderBottom: "0.5px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {(
            [
              ["freisprechen", "Freisprechen"],
              ["tippen", "Tippen"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMode(key)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 10,
                border: "0.5px solid var(--border)",
                background: mode === key ? "#7F77DD" : "var(--surface)",
                color: mode === key ? "#fff" : "var(--text-muted)",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {mode === "freisprechen" ? (
          <FreisprechenCall key="freisprechen" embedded onCallEnded={handleCallEnded} />
        ) : (
          <TippenCall key="tippen" embedded onCallEnded={handleCallEnded} />
        )}
      </div>

      {report && (
        <CallReport
          messages={report.messages}
          stats={computeCallReportStats(report.messages, report.durationSec)}
          onCallAgain={() => setReport(null)}
          onClose={() => setReport(null)}
        />
      )}
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={null}>
      <CallPageInner />
    </Suspense>
  );
}
