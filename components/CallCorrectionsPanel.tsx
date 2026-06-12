import Link from "next/link";
import type { CallCorrection } from "@/lib/corrections";
import { countSatzbauEligible } from "@/lib/corrections";

interface Props {
  corrections: CallCorrection[];
  sessionId: string;
}

export function CallCorrectionsPanel({ corrections, sessionId }: Props) {
  const practiceCount = countSatzbauEligible(corrections);
  const practiceHref = `/exercises/sentences?category=call&session=${encodeURIComponent(sessionId)}`;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          Korrekturen
        </div>
        {practiceCount > 0 && (
          <Link
            href={practiceHref}
            style={{
              fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)",
              border: "0.5px solid var(--accent-dim)", background: "var(--accent-glow)",
              padding: "6px 12px", borderRadius: 8, textDecoration: "none",
            }}
          >
            Satzbau üben ({practiceCount})
          </Link>
        )}
      </div>

      {corrections.length === 0 ? (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          background: "rgba(39,174,96,0.08)", border: "0.5px solid rgba(39,174,96,0.3)",
          fontSize: 13, color: "var(--text-muted)",
        }}>
          Keine Korrekturen — stark!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {corrections.map(c => (
            <div
              key={c.id}
              style={{
                padding: "12px 14px", borderRadius: 10,
                background: "var(--surface)", border: "0.5px solid var(--border)",
              }}
            >
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px", fontStyle: "italic" }}>
                Du: „{c.said}"
              </p>
              <p style={{ fontSize: 14, color: "var(--text)", margin: 0, fontFamily: "var(--font-serif)", lineHeight: 1.5 }}>
                💡 {c.correct}
              </p>
              {c.note && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.4 }}>
                  {c.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
