import { OpChipFor } from "../components/OpChip.jsx";
import { OpPipelineStageDot } from "./OpPipelineStageDot.jsx";
import { TRACE_STATUS, TRACE_STATUS_VARIANT } from "../../lib/chipContract.js";
import { pipelineStageVariant } from "./operatorConsoleUi.js";

export function OperatorLifecycleTimeline({ events }) {
  if (!events?.length) return null;

  return (
    <div className="rf-oc-timeline">
      {events.map((e) => {
        const variant = pipelineStageVariant(e.stageKey || e.key, e.status);
        return (
          <div
            key={e.key}
            className={[
              "rf-oc-stage",
              "rf-oc-stage--compact",
              e.status === "current" ? "rf-oc-stage--current" : "",
              e.status === "failed" ? "rf-oc-stage--failed" : "",
              e.status === "done" ? "rf-oc-stage--done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="rf-oc-stage__top">
              <span className="rf-oc-stage__time">{e.meta || "—"}</span>
              <span className="rf-oc-stage__label">
                <OpPipelineStageDot variant={variant} />
                {e.title}
              </span>
              {/* Эмодзи-контракт (владелец): у статуса этапа — только значок;
                  пояснение «Этап пайплайна: …» живёт во всплывающем
                  комментарии. Название этапа в строке сохранено. */}
              <OpChipFor
                map={TRACE_STATUS}
                variantMap={TRACE_STATUS_VARIANT}
                code={e.status}
                emojiOnly
              />
            </div>
            {e.details || e.subtitle ? (
              <details className="rf-oc-stage__details">
                <summary className="rf-oc-details__summary">
                  {e.detailsPreview || e.subtitle || "Подробности"}
                </summary>
                {e.details ? <pre className="rf-oc-details__json">{e.details}</pre> : null}
              </details>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}