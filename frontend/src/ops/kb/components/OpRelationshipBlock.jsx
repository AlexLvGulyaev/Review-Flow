import { OpPill, OpPillRow } from "../../components/OpPill.jsx";

export function OpRelationshipBlock({ title, items }) {
  return (
    <div className="op-relationship">
      <div className="op-relationship-title">{title}</div>
      {items?.length ? (
        <OpPillRow>
          {items.map((it) => (
            <OpPill key={it.key} color={it.color || "gray"} title={it.title}>
              {it.label}
            </OpPill>
          ))}
        </OpPillRow>
      ) : (
        <div className="muted">No links</div>
      )}
    </div>
  );
}

