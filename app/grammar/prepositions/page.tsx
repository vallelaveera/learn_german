"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VERIFIED_LEVELS, type VerifiedLevel } from "@/lib/grammar/verified-curriculum";

function PrepositionsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const levelParam = searchParams.get("level") as VerifiedLevel | null;
  const tier = searchParams.get("tier") === "advanced" ? "advanced" : "basic";
  const level =
    levelParam && VERIFIED_LEVELS.includes(levelParam) ? levelParam : "B1";

  useEffect(() => {
    router.replace(`/grammar/learn?level=${level}&category=prepositions&tier=${tier}`);
  }, [level, router, tier]);

  return (
    <p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
      Weiterleitung…
    </p>
  );
}

export default function GrammarPrepositionsPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <PrepositionsRedirect />
    </Suspense>
  );
}
