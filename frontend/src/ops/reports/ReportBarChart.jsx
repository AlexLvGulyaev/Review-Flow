/** Compact horizontal bar chart (CSS-only, no chart library). */
export function ReportBarChart({
  title,
  items,
  maxBars = 12,
  compact = false,
  ranking = false,
  emptyMessage = "Нет данных",
}) {
  const data = (items ?? []).slice(0, maxBars);
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartClass = [
    "rf-rep-chart",
    compact && "rf-rep-chart--compact",
    ranking && "rf-rep-chart--ranking",
  ]
    .filter(Boolean)
    .join(" ");
  const rowClass = compact ? "rf-rep-chart__row rf-rep-chart__row--stacked" : "rf-rep-chart__row";

  if (!data.length) {
    return (
      <div className={chartClass}>
        <h4 className="rf-rep-chart__title">{title}</h4>
        <p className="muted rf-rep-chart__empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={chartClass}>
      <h4 className="rf-rep-chart__title">{title}</h4>
      <ul className="rf-rep-chart__bars">
        {data.map((row) => (
          <li key={`${title}-${row.label}`} className={rowClass}>
            <span className="rf-rep-chart__label">{row.label}</span>
            <div className="rf-rep-chart__barline">
              <div className="rf-rep-chart__track">
                <div
                  className="rf-rep-chart__fill"
                  style={{ width: `${Math.max(4, (100 * row.count) / max)}%` }}
                />
              </div>
              <span className="rf-rep-chart__value">{row.count}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
