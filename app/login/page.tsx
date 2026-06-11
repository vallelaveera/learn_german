"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LevelCardGrid } from "@/components/level/LevelCardGrid";
import { NativeLanguageSelect } from "@/components/onboarding/NativeLanguageSelect";
import { MayaAvatar } from "@/components/ui/MayaAvatar";
import { DecorativeBackground } from "@/components/ui/DecorativeBackground";
import { shouldSkipLevelOnLogin, isBeginnerLevel, type GermanLevel } from "@/lib/levels";

type Step = "email" | "name" | "level" | "native";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [selectedLevel, setSelectedLevel] = useState<GermanLevel | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Valid email please"); return; }
    setError("");
    setStep("name");
  };

  const completeLogin = async (level?: GermanLevel, nativeLang?: string) => {
    const payload: { germanLevel?: GermanLevel; nativeLanguage?: string } = {};
    if (level) payload.germanLevel = level;
    if (nativeLang?.trim()) payload.nativeLanguage = nativeLang.trim();

    if (Object.keys(payload).length > 0) {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    router.push("/mode");
  };

  const handleName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("What should Maya call you?"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      if (shouldSkipLevelOnLogin(data.user)) {
        await completeLogin();
      } else {
        setStep("level");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLevel) return;
    if (isBeginnerLevel(selectedLevel)) {
      setError("");
      setStep("native");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completeLogin(selectedLevel);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLevel) return;
    if (!nativeLanguage.trim()) {
      setError("Bitte wähle deine Muttersprache.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completeLogin(selectedLevel, nativeLanguage);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    step === "email"
      ? "Your German tutor is waiting."
      : step === "name"
        ? "What should Maya call you?"
        : step === "level"
          ? "Du kannst es später ändern."
          : "Maya erklärt Hinweise in deiner Sprache.";

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px",
      overflow: "hidden",
    }}>
      <DecorativeBackground />
      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

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
            }}>CallMeDaily</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <MayaAvatar size={88} decorative />
        </div>

        <div className="ui-card" style={{ padding: "28px 24px" }}>
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
              <button type="submit" className="ui-btn-primary" style={{ fontSize: 14 }}>
                Weiter →
              </button>
            </form>
          ) : step === "name" ? (
            <form onSubmit={handleName}>
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
              <button type="submit" disabled={loading} className="ui-btn-primary" style={{ fontSize: 14, opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Wird geladen..." : "Weiter →"}
              </button>
            </form>
          ) : step === "level" ? (
            <form onSubmit={handleLevel}>
              <h2 style={{
                fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 400,
                color: "var(--text)", margin: "0 0 4px", textAlign: "center",
              }}>
                Was ist dein aktuelles Deutsch-Level?
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: "0 0 20px" }}>
                Du kannst es später ändern.
              </p>

              <LevelCardGrid selected={selectedLevel} onSelect={setSelectedLevel} />

              {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 12 }}>{error}</p>}
              <button
                type="submit"
                disabled={!selectedLevel || loading}
                className="ui-btn-primary"
                style={{ marginTop: 20, fontSize: 15, opacity: selectedLevel && !loading ? 1 : 0.5, cursor: selectedLevel && !loading ? "pointer" : "not-allowed" }}
              >
                {loading ? "Wird geladen..." : "Weiter"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNative}>
              <button
                type="button"
                onClick={() => setStep("level")}
                style={{
                  fontSize: 11, color: "var(--accent)", marginBottom: 12,
                  cursor: "pointer", background: "none", border: "none", padding: 0,
                }}
              >
                ← Level ändern
              </button>
              <h2 style={{
                fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 400,
                color: "var(--text)", margin: "0 0 4px", textAlign: "center",
              }}>
                Was ist deine Muttersprache?
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: "0 0 20px" }}>
                💡 Hinweise während des Gesprächs erscheinen in dieser Sprache.
              </p>

              <NativeLanguageSelect value={nativeLanguage} onChange={setNativeLanguage} />

              {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 12 }}>{error}</p>}
              <button
                type="submit"
                disabled={!nativeLanguage.trim() || loading}
                className="ui-btn-primary"
                style={{ marginTop: 20, fontSize: 15, opacity: nativeLanguage.trim() && !loading ? 1 : 0.5, cursor: nativeLanguage.trim() && !loading ? "pointer" : "not-allowed" }}
              >
                {loading ? "Wird geladen..." : "Los geht's"}
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
