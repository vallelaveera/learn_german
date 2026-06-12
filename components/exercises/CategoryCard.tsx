import type { ExerciseCategoryMeta } from "@/lib/exercises/categories";

interface CategoryCardProps {
  category: ExerciseCategoryMeta;
  onClick: () => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-fade-in"
      style={{
        width: "100%",
        minHeight: 108,
        padding: "16px 18px",
        borderRadius: 22,
        border: "none",
        background: "#fff",
        boxShadow: `0 8px 28px ${category.shadow}, 0 2px 8px rgba(0,0,0,0.04)`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        textAlign: "left",
        cursor: "pointer",
        transition: "transform 0.12s ease",
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: category.gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          flexShrink: 0,
          boxShadow: `0 6px 20px ${category.shadow}`,
        }}
        aria-hidden
      >
        {category.emoji}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
          {category.label}
        </span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>
          {category.description}
        </span>
      </span>
      <span style={{ fontSize: 20, color: "var(--text-dim)", flexShrink: 0 }}>›</span>
    </button>
  );
}
