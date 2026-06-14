"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOfflineLibrary } from "@/hooks/useOfflineLibrary";
import { useOfflineProgress } from "@/hooks/useOfflineProgress";

type OfflineContextValue = ReturnType<typeof useOfflineLibrary> & ReturnType<typeof useOfflineProgress>;

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const library = useOfflineLibrary();
  const progressHook = useOfflineProgress(library.words);

  const value = { ...library, ...progressHook } as OfflineContextValue;

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
