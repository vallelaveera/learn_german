"use client";

import { useEffect, useRef } from "react";
import { isBillingEnabledClient } from "@/lib/billing-config-client";

interface UseCallUsageBillingOptions {
  sessionId: string;
  sessionStart: number;
  /** True while the call is in progress (not idle). */
  active: boolean;
  onLimitReached: () => void;
  onUsageUpdate?: (usage: { used: number; limit: number; remaining: number }) => void;
}

export function useCallUsageBilling({
  sessionId,
  sessionStart,
  active,
  onLimitReached,
  onUsageUpdate,
}: UseCallUsageBillingOptions) {
  const settledRef = useRef(false);
  const onLimitRef = useRef(onLimitReached);
  const onUsageRef = useRef(onUsageUpdate);

  useEffect(() => {
    onLimitRef.current = onLimitReached;
  }, [onLimitReached]);

  useEffect(() => {
    onUsageRef.current = onUsageUpdate;
  }, [onUsageUpdate]);

  useEffect(() => {
    if (!isBillingEnabledClient()) return;

    if (!active) {
      if (settledRef.current) return;
      settledRef.current = true;
      void fetch("/api/usage/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, sessionStart }),
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data?.used !== undefined) {
            onUsageRef.current?.({
              used: data.used,
              limit: data.limit,
              remaining: data.remaining,
            });
          }
        })
        .catch(() => {});
      return;
    }

    settledRef.current = false;

    const tick = () => {
      void fetch("/api/usage/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (!data) return;
          onUsageRef.current?.({
            used: data.used,
            limit: data.limit,
            remaining: data.remaining,
          });
          if (data.limitReached) onLimitRef.current();
        })
        .catch(() => {});
    };

    const intervalId = window.setInterval(tick, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active, sessionId, sessionStart]);
}
