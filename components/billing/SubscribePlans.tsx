"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface BillingState {
  plan: PlanId;
  usage: { used: number; limit: number; remaining: number };
  subscriptionExpiresAt?: number;
  isProOwner?: boolean;
  proOwnerId?: string;
  shareMembers?: { userId: string; name: string; email: string }[];
  shareMax?: number;
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function SubscribePlans() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/billing/plan", { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        setBilling({
          plan: data.billing?.plan ?? "free",
          usage: data.usage ?? { used: 0, limit: 30, remaining: 30 },
          subscriptionExpiresAt: data.billing?.subscriptionExpiresAt,
          isProOwner: data.billing?.isProOwner,
          proOwnerId: data.billing?.proOwnerId,
          shareMembers: data.billing?.shareMembers ?? [],
          shareMax: data.billing?.shareMax ?? 3,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkout = async (plan: PlanId) => {
    setError("");
    setPaying(plan);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk || !window.Razorpay) throw new Error("Razorpay konnte nicht geladen werden.");

      const orderRes = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Order failed");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "CallMeDaily",
          description: `${PLANS[plan].labelDe} — 30 Tage`,
          order_id: orderData.orderId,
          prefill: { name: orderData.userName, email: orderData.userEmail },
          theme: { color: "#FF6B35" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            const verifyRes = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                plan,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) reject(new Error(verifyData.error ?? "Verification failed"));
            else resolve();
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        rzp.open();
      });

      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(null);
    }
  };

  const inviteFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg("");
    const res = await fetch("/api/billing/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      setInviteMsg(data.error ?? "Einladung fehlgeschlagen");
      return;
    }
    setInviteEmail("");
    setInviteMsg(`${data.member.name} eingeladen ✓`);
    refresh();
  };

  const removeFriend = async (memberId: string) => {
    await fetch(`/api/billing/share?memberId=${encodeURIComponent(memberId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    refresh();
  };

  if (loading) {
    return <p style={{ padding: 24, color: "var(--text-muted)" }}>Lädt...</p>;
  }

  const currentPlan = billing?.plan ?? "free";
  const usage = billing?.usage ?? { used: 0, limit: 30, remaining: 30 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="ui-card ui-card-padded">
        <p className="ui-label" style={{ marginBottom: 8 }}>Dein Plan</p>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          {PLANS[currentPlan].labelDe}
          {billing?.proOwnerId ? " (Pro via Freund)" : ""}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          {usage.used} / {usage.limit} Minuten diesen Monat · {usage.remaining} übrig
        </p>
        <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%`,
              background: usage.remaining < 10 ? "var(--red)" : "var(--accent)",
            }}
          />
        </div>
        {billing?.subscriptionExpiresAt && !billing.proOwnerId && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
            Aktiv bis {new Date(billing.subscriptionExpiresAt).toLocaleDateString("de-DE")}
          </p>
        )}
      </div>

      {(["free", "basic", "pro"] as PlanId[]).map(planId => {
        const plan = PLANS[planId];
        const isCurrent = currentPlan === planId && !billing?.proOwnerId;
        return (
          <div
            key={planId}
            className="ui-card ui-card-padded"
            style={{
              border: isCurrent ? "1px solid var(--accent)" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600 }}>{plan.labelDe}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {plan.monthlyMinutes} Min/Monat · {plan.priceDisplay}/Monat
                </p>
              </div>
              {isCurrent && (
                <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>AKTUELL</span>
              )}
            </div>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {plan.features.map(f => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {planId !== "free" && (
              <button
                type="button"
                disabled={paying !== null || isCurrent}
                onClick={() => void checkout(planId)}
                className="ui-btn-primary"
                style={{ fontSize: 13, opacity: paying === planId ? 0.7 : 1 }}
              >
                {paying === planId ? "Öffne Razorpay…" : isCurrent ? "Aktiver Plan" : `${plan.priceDisplay} — 30 Tage`}
              </button>
            )}
          </div>
        );
      })}

      {error && <p style={{ fontSize: 12, color: "var(--red)" }}>{error}</p>}

      {billing?.isProOwner && (
        <div className="ui-card ui-card-padded">
          <p className="ui-label" style={{ marginBottom: 8 }}>Pro — Freunde einladen</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
            Bis zu {billing.shareMax} Freunde teilen dein Pro-Abo (jeder eigene Minuten).
          </p>
          <form onSubmit={inviteFriend} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="freund@email.de"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                fontSize: 14,
              }}
            />
            <button type="submit" className="ui-btn-primary" style={{ width: "auto", minHeight: 44, padding: "0 16px" }}>
              Einladen
            </button>
          </form>
          {inviteMsg && <p style={{ fontSize: 12, color: "var(--green)", marginBottom: 8 }}>{inviteMsg}</p>}
          {(billing.shareMembers ?? []).map(m => (
            <div
              key={m.userId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 13 }}>{m.name} · {m.email}</span>
              <button
                type="button"
                onClick={() => void removeFriend(m.userId)}
                style={{ fontSize: 11, color: "var(--red)", background: "none", border: "none", cursor: "pointer" }}
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}

      <Link href="/mode" className="ui-btn-ghost" style={{ textDecoration: "none", justifyContent: "center" }}>
        ← Zurück
      </Link>
    </div>
  );
}
