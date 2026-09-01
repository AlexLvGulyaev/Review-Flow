import { labelPriority, labelScenario, refCode } from "../../lib/displayLabels.js";
import { OpChip, OpChipFor } from "../components/OpChip.jsx";
import { SCENARIO_VARIANT, ENTITY_ACTIVE, ENTITY_ACTIVE_VARIANT, chipEntry, chipVariant, SCENARIO } from "../../lib/chipContract.js";

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
  // НСИ-сценарий обращения: значок по коду справочника, перед названием ТС.
  const scenarioCode = refCode(item.scenario);
  const scenarioChip = chipEntry(SCENARIO, scenarioCode);
  return (
    <button
      type="button"
      data-case-id={item.id}
      className={active ? "rf-oc-item rf-oc-item--selected" : "rf-oc-item"}
      onClick={onSelect}
    >
      <div className="rf-oc-item__row rf-oc-item__row--head rf-rc-item__row--head">
        <span className="rf-oc-item__ts">{formatListDateTime(item.updated_at || item.created_at)}</span>
        <span className="rf-rc-ts-badge" title="Типовая ситуация">
          ТС
        </span>
        <OpChipFor
          className="rf-oc-item__status"
          map={ENTITY_ACTIVE}
          variantMap={ENTITY_ACTIVE_VARIANT}
          code={item.is_active !== false ? "active" : "inactive"}
          emojiOnly
        />
      </div>
      <div className="rf-oc-item__preview rf-rc-item__preview">
        {scenarioChip ? (
          <OpChip chip={scenarioChip} variant={chipVariant(SCENARIO_VARIANT, scenarioCode)} title={`Сценарий: ${labelScenario(item.scenario)}`} emojiOnly />
        ) : null}
        {item.title || "—"}
      </div>
      <div className="rf-oc-item__telemetry muted">
        {classificationLine(item)}
        {examples > 0 ? ` · примеров: ${examples}` : ""}
      </div>
    </button>
  );
}
