import { OpPill, moderationPillColor, publicationPillColor } from "../components/OpPill.jsx";
import { OpPipelineStageDot } from "./OpPipelineStageDot.jsx";
import { pipelineStageVariant } from "./operatorConsoleUi.js";

function statusPillColor(status) {
  if (status === "failed") return moderationPillColor("rejected");
  if (status === "done") return publicationPillColor("published");
  if (status === "current") return "blue";
  return "gray";
}

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
              <OpPill color={statusPillColor(e.status)}>{e.statusLabel}</OpPill>
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
