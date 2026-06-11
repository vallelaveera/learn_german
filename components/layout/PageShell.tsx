"use client";
import { TabBar } from "./TabBar";
import { DecorativeBackground } from "@/components/ui/DecorativeBackground";

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
        position: "relative",
        minHeight: "100dvh",
        background: "transparent",
        maxWidth: 390,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DecorativeBackground />
      {title && (
        <header
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.4)",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 11,
                fontWeight: 600,
                background: "var(--gradient)",
                color: "#fff",
                padding: "4px 9px",
                borderRadius: 10,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              DE
            </span>
            <span className="ui-title-serif" style={{ fontSize: 18 }}>
              {title}
            </span>
          </div>
          {headerRight}
        </header>
      )}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: showTabBar ? "calc(80px + env(safe-area-inset-bottom, 0px))" : undefined,
        }}
      >
        {children}
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
