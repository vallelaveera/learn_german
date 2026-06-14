"use client";

import { useCallback, useRef, useState } from "react";
import type { SessionReportItem } from "@/lib/exercises/session-report-types";

export function useSessionReportLog() {
  const startedAtRef = useRef(Date.now());
  const [items, setItems] = useState<SessionReportItem[]>([]);

  const resetLog = useCallback(() => {
    startedAtRef.current = Date.now();
    setItems([]);
  }, []);

  const logItem = useCallback((item: SessionReportItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  return {
    items,
    logItem,
    resetLog,
    startedAt: startedAtRef.current,
    getStartedAt: () => startedAtRef.current,
  };
}
