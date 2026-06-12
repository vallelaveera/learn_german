"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Home, BookOpen, User, ClipboardList } from "lucide-react";

const TABS = [
  { href: "/mode", label: "Home", Icon: Home, matchHomework: false },
  { href: "/words?view=homework", label: "Hausaufg.", Icon: ClipboardList, matchHomework: true },
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
            >
              <span className="ui-tab-icon-bubble">
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                {showBadge && (
                  <span className="ui-tab-badge">
                    {homeworkRemaining > 99 ? "99+" : homeworkRemaining}
                  </span>
                )}
              </span>
              <span className="ui-tab-label">{tab.label}</span>
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
