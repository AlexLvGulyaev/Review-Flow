import { OpChipFor } from "../components/OpChip.jsx";
import {
  MODERATION,
  MODERATION_VARIANT,
  PRIORITY,
  PRIORITY_VARIANT,
  SCENARIO,
  SCENARIO_VARIANT,
  SENTIMENT,
  SENTIMENT_VARIANT,
  chipEntry,
} from "../../lib/chipContract.js";
import { labelAiDraftStatus } from "../../lib/displayLabels.js";
import { formatDateTime, getOperationalIdentity } from "./operatorUtils.js";

/** Строки 2–3 айтема очереди: классификационные значки (Сценарий/Тональность/
    Приоритет) после статуса AI; вместо текстовых статусов — эмодзи. */
function ClassificationChip({ map, variantMap, code }) {
  const chip = chipEntry(map, code);
  if (!chip) return null;
  /* Двойная подсказка «Семья: Значение» — авто-title из OpChipFor. */
  return <OpChipFor map={map} variantMap={variantMap} code={code} emojiOnly />;
}

/** Sprint 020G — строго 3 строки: meta | preview | telemetry+classification. */
export function OperatorQueueItem({ item, active, onSelect }) {
  const identity = getOperationalIdentity(item);
  const ts = item.created_at ? formatDateTime(item.created_at) : "—";

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
        {/* Статус — значком вместо текста («Одобрено» и пр.). */}
        <OpChipFor
          className="rf-oc-item__status"
          map={MODERATION}
          variantMap={MODERATION_VARIANT}
          code={item.moderation_status}
          emojiOnly
        />
      </div>
      {/* Центральная строка — длинный текст без значков спереди (owner). */}
      <div className="rf-oc-item__preview">{item.review_text_preview || "—"}</div>
      <div className="rf-oc-item__telemetry muted">
        <span>{labelAiDraftStatus(item.moderation_status)}</span>
        {/* Три классификационных значка — прижаты вправо (owner: втроём
            слева слишком броские). */}
        <span className="rf-oc-item__badges">
          <ClassificationChip
            map={SCENARIO}
            variantMap={SCENARIO_VARIANT}
            code={item.scenario}
          />
          <ClassificationChip
            map={SENTIMENT}
            variantMap={SENTIMENT_VARIANT}
            code={item.sentiment}
          />
          <ClassificationChip
            map={PRIORITY}
            variantMap={PRIORITY_VARIANT}
            code={item.priority}
          />
        </span>
      </div>
    </button>
  );
}