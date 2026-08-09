import { labelModeration } from "./operatorLabels.js";
import { buildQueueTelemetry, formatDateTime, getOperationalIdentity } from "./operatorUtils.js";

/** Sprint 020G — строго 3 строки: meta | preview | telemetry. */
export function OperatorQueueItem({ item, active, onSelect }) {
  const identity = getOperationalIdentity(item);
  const ts = item.created_at ? formatDateTime(item.created_at) : "—";
  const statusLabel = labelModeration(item.moderation_status);

  return (
    <button
      type="button"
      data-review-id={item.review_id}
      className={active ? "rf-oc-item rf-oc-item--selected" : "rf-oc-item"}
      onClick={onSelect}
    >
      <div className="rf-oc-item__row rf-oc-item__row--head">
        <span className="rf-oc-item__ts">{ts}</span>
        <span className="rf-oc-item__ref">{identity.primary}</span>
        <span className="rf-oc-item__status">{statusLabel}</span>
      </div>
      <div className="rf-oc-item__preview">{item.review_text_preview || "—"}</div>
      <div className="rf-oc-item__telemetry muted">{buildQueueTelemetry(item)}</div>
    </button>
  );
}
