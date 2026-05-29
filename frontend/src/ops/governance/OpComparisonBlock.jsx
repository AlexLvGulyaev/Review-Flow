export function OpComparisonBlock({ title, leftTitle, left, rightTitle, right, tone = "neutral" }) {
  const toneClass =
    tone === "bad" ? "op-compare op-compare--bad" : tone === "warn" ? "op-compare op-compare--warn" : "op-compare";

  return (
    <section className={toneClass}>
      <div className="op-compare-head">
        <div className="op-compare-title">{title}</div>
      </div>
      <div className="op-compare-grid">
        <div className="op-compare-col">
          <div className="op-compare-col-title">{leftTitle}</div>
          <div className="op-compare-body">{left}</div>
        </div>
        <div className="op-compare-col">
          <div className="op-compare-col-title">{rightTitle}</div>
          <div className="op-compare-body">{right}</div>
        </div>
      </div>
    </section>
  );
}

