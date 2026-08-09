import { useMemo, useState } from "react";

function safeStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function OpPayloadBlock({ title = "Payload", payload }) {
  const [open, setOpen] = useState(false);
  const text = useMemo(() => safeStringify(payload || {}), [payload]);
  const isEmpty = !payload || (typeof payload === "object" && Object.keys(payload).length === 0);

  return (
    <div className="op-payload">
      <div className="op-payload-head">
        <div className="op-payload-title">{title}</div>
        <button type="button" className="op-btn" onClick={() => setOpen((v) => !v)} disabled={isEmpty}>
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? <pre className="op-payload-pre">{text}</pre> : null}
      {isEmpty ? <div className="op-payload-empty muted">Нет payload</div> : null}
    </div>
  );
}

