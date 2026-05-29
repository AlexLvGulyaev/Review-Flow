import { useState } from "react";

import { OpButton } from "../components/OpToolbar.jsx";
import { truncateText } from "./operatorUtils.js";

const DEFAULT_PREVIEW_LINES = 5;
const CHARS_PER_LINE = 72;

/** ~5 lines operational content block with optional full-text expand. */
export function CollapsibleTextPanel({ title, caption, text, footer, previewLines = DEFAULT_PREVIEW_LINES }) {
  const [expanded, setExpanded] = useState(false);
  const source = String(text || "").trim() || "—";
  const maxChars = previewLines * CHARS_PER_LINE;
  const canExpand = source.length > maxChars && source !== "—";

  const visible = expanded || !canExpand ? source : truncateText(source, maxChars);
  const bodyClass = expanded ? "rf-oc-text-panel__body rf-oc-text-panel__body--expanded" : "rf-oc-text-panel__body";

  return (
    <div className="rf-oc-text-panel">
      <div className="rf-oc-text-panel__head">
        <h3 className="rf-oc-text-panel__title">{title}</h3>
        {caption ? <span className="rf-oc-text-panel__caption muted">{caption}</span> : null}
      </div>
      <pre className={bodyClass}>{visible}</pre>
      {canExpand ? (
        <OpButton type="button" className="rf-oc-text-panel__toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Свернуть" : "Показать полный текст"}
        </OpButton>
      ) : null}
      {footer ? <div className="rf-oc-text-panel__footer muted">{footer}</div> : null}
    </div>
  );
}
