import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="ui-empty animate-fade-in">
      <div className="ui-empty-icon">{icon}</div>
      <h2 className="ui-title-serif" style={{ fontSize: 20, marginBottom: 8 }}>{title}</h2>
      <p className="ui-muted" style={{ marginBottom: 24, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="ui-btn-primary" style={{ maxWidth: 260, margin: "0 auto", textDecoration: "none" }}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className="ui-btn-primary" style={{ maxWidth: 260, margin: "0 auto" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
