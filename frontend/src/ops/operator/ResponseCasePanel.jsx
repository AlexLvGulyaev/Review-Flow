import { useMemo } from "react";

import { OpButton } from "../components/OpToolbar.jsx";
import {
  labelConfidenceBand,
  labelDecisionSource,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";

function confidenceBandClass(band) {
  const b = String(band || "").toLowerCase();
  if (b === "high") return "rf-oc-ch-band--high";
  if (b === "medium") return "rf-oc-ch-band--medium";
  if (b === "low") return "rf-oc-ch-band--low";
  return "rf-oc-ch-band--unknown";
}

function formatScore(score) {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return Number(score).toFixed(2);
}

function formatMatchScoreWithThreshold(score, threshold) {
  const formattedScore = formatScore(score);
  if (formattedScore === "—" || threshold == null || Number.isNaN(Number(threshold))) {
    return formattedScore;
  }
  return `${formattedScore} (порог ТС: ${Number(threshold).toFixed(2)})`;
}

/** Правая колонка верхней зоны (~60%): выбранная типовая ситуация. */
export function SelectedResponseCaseSummary({ selected, detail }) {
  const band = selected?.confidence_band;
  const noCaseEscalation =
    !selected && (detail?.case_escalated || detail?.escalation_reason === "no_case_fits");
  const cls = detail?.classification;

  if (noCaseEscalation) {
    return (
      <div className="rf-oc-ch-top-col rf-oc-ch-top-col--case">
        <div className="rf-oc-ch-top-col__head">
          <h3 className="rf-oc-summary-col__label">Типовая ситуация</h3>
        </div>
        <dl className="rf-oc-kv-list rf-oc-ch-kv rf-oc-ch-kv--compact">
          <dt>Статус</dt>
          <dd>Не выбрана</dd>
          <dt>Причина</dt>
          <dd>Ни одна типовая ситуация не подошла</dd>
          <dt>Источник решения</dt>
          <dd>{labelDecisionSource("operator_escalation")}</dd>
          {cls ? (
            <>
              <dt>Сценарий / Тональность / Приоритет</dt>
              <dd>
                {labelScenario(cls.scenario)} · {labelSentiment(cls.sentiment)} ·{" "}
                {labelPriority(cls.priority)}
              </dd>
            </>
          ) : null}
        </dl>
      </div>
    );
  }

  return (
    <div className="rf-oc-ch-top-col rf-oc-ch-top-col--case">
      <div className="rf-oc-ch-top-col__head">
        <h3 className="rf-oc-summary-col__label">Выбранная типовая ситуация</h3>
        {band ? (
          <span className={`rf-oc-ch-band ${confidenceBandClass(band)}`}>
            Уверенность: {labelConfidenceBand(band)}
          </span>
        ) : (
          <span className="rf-oc-ch-band rf-oc-ch-band--low">Уверенность: {labelConfidenceBand("low")}</span>
        )}
      </div>

      {!selected ? (
        <p className="muted rf-oc-ch-top-empty">
          Типовая ситуация не выбрана. Выберите альтернативу ниже или выполните эскалацию.
        </p>
      ) : (
        <dl className="rf-oc-kv-list rf-oc-ch-kv rf-oc-ch-kv--compact">
          <dt>Название</dt>
          <dd>{selected.title}</dd>
          <dt>Описание</dt>
          <dd className="rf-oc-ch-case-desc">{selected.description || "—"}</dd>
          <dt>Продукт</dt>
          <dd>{selected.product_area?.name ?? "—"}</dd>
          <dt>Тема</dt>
          <dd>{selected.topic?.name ?? "—"}</dd>
          <dt>Сценарий / Тональность / Приоритет</dt>
          <dd>
            {labelScenario(selected.scenario)} · {labelSentiment(selected.sentiment)} ·{" "}
            {labelPriority(selected.priority)}
          </dd>
          <dt>Оценка совпадения</dt>
          <dd>{formatMatchScoreWithThreshold(selected.match_confidence, selected.confidence_threshold)}</dd>
          <dt>Источник выбора</dt>
          <dd>{labelDecisionSource(selected.decision_source)}</dd>
        </dl>
      )}
    </div>
  );
}

/** Альтернативные типовые ситуации — компактные строки (AF retrieval chunk-row). */
export function ResponseCaseAlternatives({
  detail,
  actionLoading,
  workflowCompleted,
  onOverrideCase,
}) {
  const selected = detail.selected_response_case;
  const actionsDisabled = actionLoading || workflowCompleted;

  const alternatives = useMemo(() => {
    const selectedId = selected?.response_case_id;
    return (detail.case_alternatives || [])
      .filter((alt) => !alt.is_selected && alt.response_case_id !== selectedId)
      .sort((a, b) => a.rank - b.rank);
  }, [detail.case_alternatives, selected?.response_case_id]);

  if (!alternatives.length) return null;

  return (
    <section className="rf-oc-ch-alternatives" aria-label="Альтернативные типовые ситуации">
      <h4 className="rf-oc-ch-alternatives__title">Альтернативные типовые ситуации</h4>
      <ul className="rf-oc-ch-alt-rows">
        {alternatives.map((alt) => (
          <li key={alt.response_case_id} className="rf-oc-ch-alt-row">
            <span className="rf-oc-ch-alt-row__score">{formatScore(alt.match_score)}</span>
            <span className="rf-oc-ch-alt-row__sep" aria-hidden="true">
              |
            </span>
            <strong className="rf-oc-ch-alt-row__title">{alt.title}</strong>
            <span className="rf-oc-ch-alt-row__sep" aria-hidden="true">
              |
            </span>
            <span className="rf-oc-ch-alt-row__desc muted">{alt.description || "—"}</span>
            <OpButton
              type="button"
              className="rf-oc-ch-alt-row__btn rf-oc-btn--minor"
              disabled={actionsDisabled}
              onClick={() => onOverrideCase(alt.response_case_id, null)}
            >
              Выбрать
            </OpButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
