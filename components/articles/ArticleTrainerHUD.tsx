interface ArticleTrainerHUDProps {
  score: number;
  streak: number;
  progressCurrent: number;
  progressTotal: number;
  accentColor: string;
}

export function ArticleTrainerHUD({
  score,
  streak,
  progressCurrent,
  progressTotal,
  accentColor,
}: ArticleTrainerHUDProps) {
  const progress = progressTotal > 0
    ? Math.min(100, (progressCurrent / progressTotal) * 100)
    : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        marginBottom: 12,
        background: "rgba(255,255,255,0.75)",
        borderRadius: 12,
        border: "1px solid var(--border-light)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: accentColor, whiteSpace: "nowrap" }}>
        {score} Punkte
      </div>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--border-light)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: accentColor,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      {streak > 1 && (
        <div style={{ fontSize: 11, color: "#EF9F27", fontWeight: 700, whiteSpace: "nowrap" }}>
          🔥 {streak} Streak!
        </div>
      )}
    </div>
  );
}
