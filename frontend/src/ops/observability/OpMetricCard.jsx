export function OpMetricCard({ label, value, hint, tone = "neutral" }) {
  const toneClass =
    tone === "good"
      ? "op-metric op-metric--good"
      : tone === "warn"
        ? "op-metric op-metric--warn"
        : tone === "bad"
          ? "op-metric op-metric--bad"
          : "op-metric";

  return (
    <div className={toneClass}>
      <div className="op-metric-label">{label}</div>
      <div className="op-metric-value">{value ?? "—"}</div>
      {hint ? <div className="op-metric-hint">{hint}</div> : null}
    </div>
  );
}

