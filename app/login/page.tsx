"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"email" | "name">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Valid email please"); return; }
    setError("");
    setStep("name");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("What should Maya call you?"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) throw new Error("Login failed");
      router.push("/call");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{
              fontFamily: "var(--font-serif)", fontSize: 12, fontWeight: 600,
              background: "var(--accent)", color: "var(--bg)",
              padding: "2px 7px", borderRadius: 3, letterSpacing: "0.05em"
            }}>DE</span>
            <span style={{
              fontFamily: "var(--font-serif)", fontSize: 22,
              fontWeight: 300, color: "var(--text)"
            }}>Call to Learn</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {step === "email"
              ? "Your personal German friend is waiting."
              : "What should Maya call you?"}
          </p>
        </div>

        {/* Maya avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--surface)", border: "2px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <span style={{
              fontFamily: "var(--font-serif)", fontSize: 32,
              fontWeight: 300, color: "var(--accent)"
            }}>F</span>
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 20, height: 20, borderRadius: "50%",
              background: "var(--green)", border: "2px solid var(--bg)",
            }}/>
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "28px 24px",
        }}>
          {step === "email" ? (
            <form onSubmit={handleEmail}>
              <label style={{
                display: "block", fontSize: 11, color: "var(--text-muted)",
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de"
                autoFocus
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontSize: 14,
                  fontFamily: "var(--font-mono)", marginBottom: 16,
                  outline: "none",
                }}
              />
              {error && <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{error}</p>}
              <button type="submit" style={{
                width: "100%", padding: "12px",
                background: "var(--accent)", border: "none",
                borderRadius: 8, color: "var(--bg)", fontSize: 14,
                fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
              }}>
                Weiter →
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{email}</span>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  style={{ fontSize: 11, color: "var(--accent)", marginLeft: 8, cursor: "pointer", background: "none", border: "none" }}
                >
                  ändern
                </button>
              </div>
              <label style={{
                display: "block", fontSize: 11, color: "var(--text-muted)",
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8
              }}>
                Dein Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Veera"
                autoFocus
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontSize: 14,
                  fontFamily: "var(--font-mono)", marginBottom: 16,
                  outline: "none",
                }}
              />
              {error && <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "12px",
                background: "var(--accent)", border: "none",
                borderRadius: 8, color: "var(--bg)", fontSize: 14,
                fontWeight: 500, cursor: loading ? "wait" : "pointer",
                fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Wird geladen..." : "Mit Maya sprechen →"}
              </button>
            </form>
          )}
        </div>

        <p style={{
          textAlign: "center", fontSize: 11, color: "var(--text-dim)",
          marginTop: 20, lineHeight: 1.6,
        }}>
          No password needed. Maya remembers you.
        </p>
      </div>
    </div>
  );
}
