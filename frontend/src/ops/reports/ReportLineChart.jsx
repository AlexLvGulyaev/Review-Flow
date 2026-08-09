import { useMemo } from "react";

import { REPORT_CHART } from "./reportChartTheme.js";

const PAD = { top: 12, right: 12, bottom: 28, left: 36 };

function niceMax(value) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = Math.ceil(value / exp);
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * exp;
}

export function ReportLineChart({ title, items, height = 200 }) {
  const data = items ?? [];
  const width = 640;

  const { path, areaPath, yTicks, xLabels, maxY } = useMemo(() => {
    if (!data.length) {
      return { path: "", areaPath: "", yTicks: [], xLabels: [], maxY: 1 };
    }
    const counts = data.map((d) => d.count);
    const maxY = niceMax(Math.max(...counts, 1));
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const points = data.map((d, i) => {
      const x = PAD.left + (data.length === 1 ? innerW / 2 : i * step);
      const y = PAD.top + innerH - (d.count / maxY) * innerH;
      return { x, y, label: d.label, count: d.count };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const baseY = PAD.top + innerH;
    const area =
      `${line} L${points[points.length - 1].x.toFixed(1)},${baseY} L${points[0].x.toFixed(1)},${baseY} Z`;

    const yTicks = [0, maxY / 2, maxY].map((v) => ({
      value: v,
      y: PAD.top + innerH - (v / maxY) * innerH,
    }));

    const xLabels = points.map((p) => ({ x: p.x, label: p.label }));

    return { path: line, areaPath: area, yTicks, xLabels, maxY };
  }, [data, height]);

  if (!data.length) {
    return (
      <div className="rf-rep-chart rf-rep-chart--viz">
        <h4 className="rf-rep-chart__title">{title}</h4>
        <p className="muted rf-rep-chart__empty">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="rf-rep-chart rf-rep-chart--viz rf-rep-chart--line">
      <h4 className="rf-rep-chart__title">{title}</h4>
      <svg
        className="rf-rep-viz rf-rep-viz--line"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((t) => (
          <g key={t.value}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke={REPORT_CHART.grid}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={t.y + 4}
              textAnchor="end"
              fontSize="10"
              fill={REPORT_CHART.axis}
            >
              {Math.round(t.value)}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={REPORT_CHART.fill} stroke="none" />
        <path
          d={path}
          fill="none"
          stroke={REPORT_CHART.stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const innerW = width - PAD.left - PAD.right;
          const innerH = height - PAD.top - PAD.bottom;
          const step = data.length > 1 ? innerW / (data.length - 1) : 0;
          const x = PAD.left + (data.length === 1 ? innerW / 2 : i * step);
          const y = PAD.top + innerH - (d.count / maxY) * innerH;
          return (
            <circle
              key={`${d.label}-${i}`}
              cx={x}
              cy={y}
              r="3.5"
              fill={REPORT_CHART.stroke}
            >
              <title>{`${d.label}: ${d.count}`}</title>
            </circle>
          );
        })}
        {xLabels.map((l, i) => (
          <text
            key={`x-${i}`}
            x={l.x}
            y={height - 6}
            textAnchor="middle"
            fontSize="9"
            fill={REPORT_CHART.labelMuted}
          >
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
