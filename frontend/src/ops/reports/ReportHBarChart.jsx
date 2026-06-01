import { useMemo } from "react";

import { REPORT_CHART } from "./reportChartTheme.js";

const ROW_H = 22;
const PAD = { top: 8, right: 44, bottom: 8, left: 120 };
const BAR_H = 14;

export function ReportHBarChart({ title, items, maxBars = 14 }) {
  const data = (items ?? []).slice(0, maxBars);
  const width = 640;

  const { bars, maxCount, chartHeight } = useMemo(() => {
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const chartHeight = PAD.top + PAD.bottom + data.length * ROW_H;
    const innerW = width - PAD.left - PAD.right;
    const bars = data.map((row, i) => {
      const y = PAD.top + i * ROW_H + (ROW_H - BAR_H) / 2;
      const w = Math.max(2, (row.count / maxCount) * innerW);
      return { ...row, y, w, barY: y };
    });
    return { bars, maxCount, chartHeight };
  }, [data, width]);

  if (!data.length) {
    return (
      <div className="rf-rep-chart rf-rep-chart--viz">
        <h4 className="rf-rep-chart__title">{title}</h4>
        <p className="muted rf-rep-chart__empty">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="rf-rep-chart rf-rep-chart--viz rf-rep-chart--hbar">
      <h4 className="rf-rep-chart__title">{title}</h4>
      <svg
        className="rf-rep-viz rf-rep-viz--hbar"
        viewBox={`0 0 ${width} ${chartHeight}`}
        role="img"
        aria-label={title}
        preserveAspectRatio="xMidYMid meet"
      >
        {bars.map((row) => (
          <g key={`${title}-${row.label}`}>
            <text
              x={PAD.left - 8}
              y={row.y + BAR_H / 2 + 4}
              textAnchor="end"
              fontSize="10"
              fill={REPORT_CHART.label}
            >
              <title>{row.label}</title>
              {truncateLabel(row.label, 16)}
            </text>
            <rect
              x={PAD.left}
              y={row.barY}
              width={row.w}
              height={BAR_H}
              rx="3"
              fill={REPORT_CHART.bar}
            >
              <title>{`${row.label}: ${row.count}`}</title>
            </rect>
            <text
              x={width - PAD.right + 6}
              y={row.y + BAR_H / 2 + 4}
              fontSize="10"
              fill={REPORT_CHART.labelMuted}
            >
              {row.count}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function truncateLabel(text, maxLen) {
  const s = String(text ?? "—");
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}
