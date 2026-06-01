import { labelEntityActive, labelPriority, labelScenario } from "../../lib/displayLabels.js";

function formatListDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusUpper(isActive) {
  return isActive !== false ? "АКТИВНА" : "В АРХИВЕ";
}

function classificationLine(item) {
  const parts = [
    item.product_area?.name,
    item.topic?.name,
    item.scenario ? labelScenario(item.scenario) : null,
    item.priority ? labelPriority(item.priority) : null,
  ].filter(Boolean);
  return parts.join(" • ") || "—";
}

/** Трёхстрочный элемент списка — паттерн OperatorQueueItem. */
export function ResponseCaseQueueItem({ item, active, onSelect }) {
  const examples = item.examples_count ?? 0;
  return (
    <button
      type="button"
      className={active ? "rf-oc-item rf-oc-item--selected" : "rf-oc-item"}
      onClick={onSelect}
    >
      <div className="rf-oc-item__row rf-oc-item__row--head rf-rc-item__row--head">
        <span className="rf-oc-item__ts">{formatListDateTime(item.updated_at || item.created_at)}</span>
        <span className="rf-rc-ts-badge" title="Типовая ситуация">
          ТС
        </span>
        <span className="rf-oc-item__status">{statusUpper(item.is_active)}</span>
      </div>
      <div className="rf-oc-item__preview">{item.title || "—"}</div>
      <div className="rf-oc-item__telemetry muted">
        {classificationLine(item)}
        {examples > 0 ? ` · примеров: ${examples}` : ""}
      </div>
    </button>
  );
}
