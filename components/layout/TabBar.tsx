"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Home, BookOpen, User, ClipboardList } from "lucide-react";

const TABS = [
  { href: "/mode", label: "Home", Icon: Home, matchHomework: false },
  { href: "/words?view=homework", label: "Hausaufgaben", Icon: ClipboardList, matchHomework: true },
  { href: "/words", label: "Üben", Icon: BookOpen, matchHomework: false },
  { href: "/profile", label: "Profil", Icon: User, matchHomework: false },
] as const;

function TabBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const [homeworkRemaining, setHomeworkRemaining] = useState(0);

  useEffect(() => {
    fetch("/api/homework/status")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.enabled && typeof data.remainingReps === "number") {
          setHomeworkRemaining(data.remainingReps);
        } else {
          setHomeworkRemaining(0);
        }
      })
      .catch(() => setHomeworkRemaining(0));
  }, [pathname, view]);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 390,
        display: "flex",
        gap: 2,
        padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 10px)",
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0 -8px 32px rgba(255, 107, 53, 0.08)",
        zIndex: 100,
      }}
    >
      {TABS.map(tab => {
        const isHomeworkTab = tab.matchHomework;
        const active = isHomeworkTab
          ? pathname === "/words" && view === "homework"
          : tab.href === "/words"
            ? pathname === "/words" && view !== "homework"
            : pathname === tab.href || (tab.href === "/mode" && pathname === "/");
        const showBadge = isHomeworkTab && homeworkRemaining > 0;
        const Icon = tab.Icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              minHeight: 48,
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--text-dim)",
              position: "relative",
              borderRadius: 12,
              background: active ? "var(--accent-soft)" : "transparent",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              {showBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -12,
                    minWidth: 17,
                    height: 17,
                    padding: "0 4px",
                    borderRadius: 9,
                    background: "var(--red)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #fff",
                  }}
                >
                  {homeworkRemaining > 99 ? "99+" : homeworkRemaining}
                </span>
              )}
            </span>
            <span style={{ fontSize: 9, fontWeight: active ? 600 : 500, letterSpacing: "0.01em", textAlign: "center" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  return (
    <Suspense fallback={null}>
      <TabBarInner />
    </Suspense>
  );
}
