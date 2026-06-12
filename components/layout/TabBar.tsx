"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Home, BookOpen, User, ClipboardList } from "lucide-react";

const TABS = [
  {
    href: "/mode",
    label: "Home",
    Icon: Home,
    matchHomework: false,
    color: "#FF6B35",
    soft: "rgba(255, 107, 53, 0.16)",
  },
  {
    href: "/words?view=homework",
    label: "Hausaufg.",
    Icon: ClipboardList,
    matchHomework: true,
    color: "#D97706",
    soft: "rgba(217, 119, 6, 0.16)",
  },
  {
    href: "/words",
    label: "Üben",
    Icon: BookOpen,
    matchHomework: false,
    color: "#805AD5",
    soft: "rgba(128, 90, 213, 0.16)",
  },
  {
    href: "/profile",
    label: "Profil",
    Icon: User,
    matchHomework: false,
    color: "#4A90E2",
    soft: "rgba(74, 144, 226, 0.16)",
  },
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
    <nav className="ui-tab-bar" aria-label="Hauptnavigation">
      <div className="ui-tab-bar-bubble">
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
              className={`ui-tab-item${active ? " ui-tab-item-active" : ""}`}
              style={{ color: active ? tab.color : "var(--text-dim)" }}
            >
              <span
                className="ui-tab-icon-bubble"
                style={{
                  background: active ? tab.soft : "transparent",
                  boxShadow: active ? `inset 0 0 0 1px ${tab.color}33` : undefined,
                  color: active ? tab.color : tab.color,
                  opacity: active ? 1 : 0.72,
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                {showBadge && (
                  <span className="ui-tab-badge">
                    {homeworkRemaining > 99 ? "99+" : homeworkRemaining}
                  </span>
                )}
              </span>
              <span className="ui-tab-label" style={{ color: active ? tab.color : undefined }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
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
