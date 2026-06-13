"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { AdminCard } from "@/components/admin/AdminShell";
import type { UserFeedback } from "@/lib/feedback/types";

const PURPLE = "#7F77DD";

const SOURCE_LABEL: Record<UserFeedback["source"], string> = {
  post_call: "Nach Anruf",
  profile: "Profil",
  home: "Home",
};

function Stars({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={14}
          fill={n <= value ? PURPLE : "none"}
          color={n <= value ? PURPLE : "var(--text-dim)"}
        />
      ))}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/feedback?limit=100")
      .then(r => {
        if (r.status === 401) {
          router.push("/mode");
          return null;
        }
        if (!r.ok) throw new Error("Load failed");
        return r.json();
      })
      .then(data => {
        if (data?.feedback) setFeedback(data.feedback);
        setLoading(false);
      })
      .catch(e => {
        setError(String(e));
        setLoading(false);
      });
  }, [router]);

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
      : "—";
  const avgAgain =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.wouldUseAgain, 0) / feedback.length).toFixed(1)
      : "—";

  return (
    <>
      {loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Lädt…</p>}
      {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <AdminCard style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Einträge
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: PURPLE, fontFamily: "var(--font-mono)" }}>{feedback.length}</div>
            </AdminCard>
            <AdminCard style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Ø Erfahrung · Experience
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: PURPLE, fontFamily: "var(--font-mono)" }}>{avgRating}</div>
            </AdminCard>
            <AdminCard style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Ø Wieder nutzen · Use again
              </div>
              <div style={{ fontSize: 28, fontWeight: 500, color: PURPLE, fontFamily: "var(--font-mono)" }}>{avgAgain}</div>
            </AdminCard>
          </div>

          {feedback.length === 0 ? (
            <AdminCard>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Noch kein Feedback eingegangen.</p>
            </AdminCard>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {feedback.map(item => (
                <AdminCard key={item.id} style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.userName}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{item.userEmail}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{fmt(item.createdAt)}</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px", marginBottom: item.message ? 10 : 0, fontSize: 12, color: "var(--text-muted)" }}>
                    <span>
                      Erfahrung · Experience: <Stars value={item.rating} /> ({item.rating}/5)
                    </span>
                    <span>
                      Wieder nutzen · Use again: <Stars value={item.wouldUseAgain} /> ({item.wouldUseAgain}/5)
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "color-mix(in srgb, #7F77DD 12%, var(--bg))",
                        color: PURPLE,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {SOURCE_LABEL[item.source]}
                      {item.callMode ? ` · ${item.callMode}` : ""}
                    </span>
                  </div>

                  {item.message && (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {item.message}
                    </p>
                  )}
                </AdminCard>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
