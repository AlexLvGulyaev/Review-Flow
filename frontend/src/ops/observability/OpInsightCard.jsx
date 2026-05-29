import { OpPill, OpPillRow } from "../components/OpPill.jsx";

export function OpInsightCard({ title, description, tone = "neutral", pills, children }) {
  const tonePill =
    tone === "good" ? { color: "green", label: "OK" } : tone === "warn" ? { color: "orange", label: "Attention" } : tone === "bad" ? { color: "red", label: "Issue" } : { color: "gray", label: "Info" };

  return (
    <div className="op-insight">
      <div className="op-insight-head">
        <div>
          <div className="op-insight-title">{title}</div>
          {description ? <div className="op-insight-desc">{description}</div> : null}
        </div>
        <OpPillRow>
          <OpPill color={tonePill.color}>{tonePill.label}</OpPill>
          {pills?.map((p) => (
            <OpPill key={p.key} color={p.color} title={p.title}>
              {p.label}
            </OpPill>
          ))}
        </OpPillRow>
      </div>
      {children ? <div className="op-insight-body">{children}</div> : null}
    </div>
  );
}

