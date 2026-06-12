"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";

export interface IllustrationBaseProps {
  src: string;
  primary?: string;
  secondary?: string;
  skin?: string;
  hair?: string;
  width?: number;
  height?: number;
  className?: string;
}

function recolorSvg(
  svgText: string,
  colors: { primary: string; secondary: string; skin: string; hair: string },
): string {
  const replacements: [string, string][] = [
    ["#6C63FF", colors.primary],
    ["#6c63ff", colors.primary],
    ["#FF6584", colors.primary],
    ["#ff6584", colors.primary],
    ["#F2F2F2", colors.secondary],
    ["#f2f2f2", colors.secondary],
    ["#E6E6E6", colors.secondary],
    ["#e6e6e6", colors.secondary],
    ["#FFB8B8", colors.skin],
    ["#ffb8b8", colors.skin],
    ["#3F3D56", colors.hair],
    ["#3f3d56", colors.hair],
  ];

  let result = svgText;
  for (const [from, to] of replacements) {
    result = result.split(from).join(to);
  }
  return result;
}

function Skeleton() {
  return <div aria-hidden="true" className="ui-illustration-skeleton" />;
}

export function IllustrationBase({
  src,
  primary = BRAND.primary,
  secondary = BRAND.primaryLight,
  skin = BRAND.skin,
  hair = BRAND.hair,
  width = 280,
  height = 220,
  className,
}: IllustrationBaseProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const colors = useMemo(
    () => ({ primary, secondary, skin, hair }),
    [primary, secondary, skin, hair],
  );

  useEffect(() => {
    let cancelled = false;
    setSvgHtml(null);
    setFailed(false);

    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error("SVG fetch failed");
        return res.text();
      })
      .then(text => {
        if (cancelled) return;
        if (!text.trim().startsWith("<")) throw new Error("Invalid SVG");
        setSvgHtml(recolorSvg(text, colors));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src, colors]);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={`ui-illustration-wrap${className ? ` ${className}` : ""}`}
        style={{ "--illus-w": `${width}px`, "--illus-h": `${height}px` } as React.CSSProperties}
      >
        <div className="ui-illustration-fallback">📚</div>
      </div>
    );
  }

  const cssVars = {
    "--illus-w": `${width}px`,
    "--illus-h": `${height}px`,
  } as React.CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`ui-illustration-wrap${className ? ` ${className}` : ""}`}
      style={cssVars}
    >
      {svgHtml ? (
        <div dangerouslySetInnerHTML={{ __html: svgHtml }} />
      ) : (
        <Skeleton />
      )}
    </div>
  );
}
