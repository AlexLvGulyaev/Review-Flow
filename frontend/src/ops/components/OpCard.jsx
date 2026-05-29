import { OpPill, OpPillRow } from "./OpPill.jsx";

export function OpCardButton({
  active,
  onClick,
  primaryLeft,
  primaryRight,
  secondary,
  preview,
  pills,
}) {
  return (
    <button type="button" className={active ? "op-card op-card--active" : "op-card"} onClick={onClick}>
      <div className="op-card-primary">
        <strong>{primaryLeft}</strong>
        {primaryRight ? <span className="op-card-secondary">{primaryRight}</span> : null}
      </div>
      {secondary ? <div className="op-card-secondary">{secondary}</div> : null}
      {preview ? <div className="op-card-preview">{preview}</div> : null}
      {pills?.length ? (
        <OpPillRow>
          {pills.map((p) => (
            <OpPill key={p.key} color={p.color} title={p.title}>
              {p.label}
            </OpPill>
          ))}
        </OpPillRow>
      ) : null}
    </button>
  );
}

