import { useMemo, useState } from "react";

import { REPORT_CHART, REPORT_DONUT_PALETTES } from "./reportChartTheme.js";

const SIZE = 128;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUT = 52;
const R_IN = 32;

const EMPTY_MESSAGE = "За выбранный период данные отсутствуют";

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.999) {
    return fullDonutRingPath();
  }
  if (sweep <= 0.001) {
    return "";
  }
  const large = sweep > 180 ? 1 : 0;
  const oStart = polar(CX, CY, R_OUT, startAngle);
  const oEnd = polar(CX, CY, R_OUT, endAngle);
  const iStart = polar(CX, CY, R_IN, endAngle);
  const iEnd = polar(CX, CY, R_IN, startAngle);
  return [
    `M ${oStart.x.toFixed(2)} ${oStart.y.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${oEnd.x.toFixed(2)} ${oEnd.y.toFixed(2)}`,
    `L ${iStart.x.toFixed(2)} ${iStart.y.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${iEnd.x.toFixed(2)} ${iEnd.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function fullDonutRingPath() {
  const oTop = polar(CX, CY, R_OUT, 0);
  const oBottom = polar(CX, CY, R_OUT, 180);
  const iTop = polar(CX, CY, R_IN, 0);
  const iBottom = polar(CX, CY, R_IN, 180);
  return [
    `M ${oTop.x.toFixed(2)} ${oTop.y.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 1 1 ${oBottom.x.toFixed(2)} ${oBottom.y.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 1 1 ${oTop.x.toFixed(2)} ${oTop.y.toFixed(2)}`,
    `M ${iTop.x.toFixed(2)} ${iTop.y.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 1 0 ${iBottom.x.toFixed(2)} ${iBottom.y.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 1 0 ${iTop.x.toFixed(2)} ${iTop.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function shareOf(row, total) {
  if (row.share != null && !Number.isNaN(row.share)) return row.share;
  return total ? Math.round((1000 * row.count) / total) / 10 : 0;
}

/** Compact donut chart with legend (CSS/SVG, no chart library). */
export function ReportDonutChart({
  title,
  items,
  palette = "default",
  emptyMessage = EMPTY_MESSAGE,
}) {
  const [activeLabel, setActiveLabel] = useState(null);
  const data = items ?? [];
  const colors = REPORT_DONUT_PALETTES[palette] ?? REPORT_DONUT_PALETTES.default;

  const { segments, total } = useMemo(() => {
    const total = data.reduce((sum, row) => sum + row.count, 0);
    let angle = 0;
    const segments = data.map((row, idx) => {
      const sweep = total ? (360 * row.count) / total : 0;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return {
        ...row,
        start,
        end,
        share: shareOf(row, total),
        color: colors[idx % colors.length],
      };
    });
    return { segments, total };
  }, [data, colors]);

  const active = segments.find((s) => s.label === activeLabel);

  if (!data.length || total === 0) {
    return (
      <div className="rf-rep-chart rf-rep-chart--donut">
        <h4 className="rf-rep-chart__title">{title}</h4>
        <p className="muted rf-rep-chart__empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rf-rep-chart rf-rep-chart--donut">
      <h4 className="rf-rep-chart__title">{title}</h4>
      <div className="rf-rep-donut">
        <svg
          className="rf-rep-donut__svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={title}
        >
          {segments.map((seg) => {
            const d = arcPath(seg.start, seg.end);
            if (!d) return null;
            return (
            <path
              key={seg.label}
              d={d}
              fill={seg.color}
              stroke="#fff"
              strokeWidth="1"
              opacity={activeLabel && activeLabel !== seg.label ? 0.45 : 1}
              className="rf-rep-donut__slice"
              onClick={() => setActiveLabel((prev) => (prev === seg.label ? null : seg.label))}
            >
              <title>{`${seg.label}: ${seg.count} (${seg.share}%)`}</title>
            </path>
            );
          })}
          <text
            x={CX}
            y={CY - 2}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={REPORT_CHART.label}
          >
            {total}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8" fill={REPORT_CHART.labelMuted}>
            всего
          </text>
        </svg>
        <ul className="rf-rep-donut__legend">
          {segments.map((seg) => (
            <li key={seg.label}>
              <button
                type="button"
                className={`rf-rep-donut__legend-item${activeLabel === seg.label ? " active" : ""}`}
                onClick={() => setActiveLabel((prev) => (prev === seg.label ? null : seg.label))}
              >
                <span className="rf-rep-donut__swatch" style={{ background: seg.color }} />
                <span className="rf-rep-donut__legend-label" title={seg.label}>
                  {seg.label}
                </span>
                <span className="rf-rep-donut__legend-meta">
                  {seg.count} · {seg.share}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {active ? (
        <p className="rf-rep-donut__detail muted">
          {active.label}: {active.count} ({active.share}%)
        </p>
      ) : null}
    </div>
  );
}
