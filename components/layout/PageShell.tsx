"use client";
import { TabBar } from "./TabBar";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  showTabBar?: boolean;
  headerRight?: React.ReactNode;
}

export function PageShell({ children, title, showTabBar = true, headerRight }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        maxWidth: 390,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {title && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
            borderBottom: "0.5px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 11,
                fontWeight: 600,
                background: "var(--accent)",
                color: "var(--bg)",
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              DE
            </span>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 300, color: "var(--text)" }}>
              {title}
            </span>
          </div>
          {headerRight}
        </header>
      )}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: showTabBar ? "calc(72px + env(safe-area-inset-bottom, 0px))" : undefined,
        }}
      >
        {children}
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
