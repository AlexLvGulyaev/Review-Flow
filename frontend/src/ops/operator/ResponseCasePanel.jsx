import { useState } from "react";

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

function buildLifecycleBadges(detail, selected) {
  const badges = [];
  const logs = detail.operational_logs || [];
  const candidateCreated = logs.some((e) => e.event_type === "case_candidate_created");

  if (selected) {
    badges.push({ id: "selected", label: "Ситуация выбрана" });
  }
  if (selected?.operator_confirmed) {
    badges.push({ id: "confirmed", label: "Ситуация подтверждена" });
  }
  if (selected?.is_operator_override) {
    badges.push({ id: "overridden", label: "Ситуация изменена" });
  }
  if (candidateCreated) {
    badges.push({ id: "candidate", label: "Кандидат создан" });
  }
  return badges;
}

export function ResponseCasePanel({
  detail,
  actionLoading,
  workflowCompleted,
  onConfirmCase,
  onOverrideCase,
  onOpenCandidateModal,
}) {
  const [overrideComment, setOverrideComment] = useState("");
  const [pendingOverrideId, setPendingOverrideId] = useState(null);

  const selected = detail.selected_response_case;
  const alternatives = detail.case_alternatives || [];
  const band = selected?.confidence_band;
  const needsConfirm =
    selected?.requires_operator_confirmation && !selected?.operator_confirmed;
  const actionsDisabled = actionLoading || workflowCompleted;

  const lifecycleBadges = buildLifecycleBadges(detail, selected);

  function handleOverrideClick(caseId) {
    if (pendingOverrideId === caseId) {
      onOverrideCase(caseId, overrideComment.trim() || null);
      setPendingOverrideId(null);
      setOverrideComment("");
      return;
    }
    setPendingOverrideId(caseId);
    setOverrideComment("");
  }

  return (
    <section className="rf-oc-ch-panel" aria-label="Типовая ситуация">
      <div className="rf-oc-ch-panel__head">
        <h3 className="rf-oc-detail-block__title">Выбранная типовая ситуация</h3>
        {band ? (
          <span className={`rf-oc-ch-band ${confidenceBandClass(band)}`}>
            Уверенность: {labelConfidenceBand(band)}
          </span>
        ) : (
          <span className="rf-oc-ch-band rf-oc-ch-band--low">Уверенность: {labelConfidenceBand("low")}</span>
        )}
      </div>

      {lifecycleBadges.length ? (
        <ul className="rf-oc-ch-lifecycle">
          {lifecycleBadges.map((b) => (
            <li key={b.id} className={`rf-oc-ch-lifecycle__item rf-oc-ch-lifecycle__item--${b.id}`}>
              {b.label}
            </li>
          ))}
        </ul>
      ) : null}

      {!selected ? (
        <div className="rf-oc-ch-empty">
          <p>
            Подходящая типовая ситуация не выбрана автоматически. Выберите вариант из списка ниже или
            предложите новую ситуацию.
          </p>
        </div>
      ) : (
        <dl className="rf-oc-kv-list rf-oc-ch-kv">
          <dt>Название</dt>
          <dd>{selected.title}</dd>
          <dt>Описание</dt>
          <dd>{selected.description || "—"}</dd>
          <dt>Направление</dt>
          <dd>{selected.product_area?.name ?? "—"}</dd>
          <dt>Тема</dt>
          <dd>{selected.topic?.name ?? "—"}</dd>
          <dt>Сценарий / тон / приоритет</dt>
          <dd>
            {labelScenario(selected.scenario)} · {labelSentiment(selected.sentiment)} ·{" "}
            {labelPriority(selected.priority)}
          </dd>
          <dt>Источник решения</dt>
          <dd>{labelDecisionSource(selected.decision_source)}</dd>
        </dl>
      )}

      <div className="rf-oc-ch-actions">
        {needsConfirm ? (
          <OpButton type="button" variant="primary" disabled={actionsDisabled} onClick={onConfirmCase}>
            Подтвердить типовую ситуацию
          </OpButton>
        ) : null}
        <OpButton type="button" disabled={actionsDisabled} onClick={onOpenCandidateModal}>
          Создать новую типовую ситуацию
        </OpButton>
      </div>

      {alternatives.length ? (
        <div className="rf-oc-ch-alternatives">
          <h4 className="rf-oc-ch-alternatives__title">Альтернативные типовые ситуации</h4>
          <ul className="rf-oc-ch-alt-list">
            {alternatives.map((alt) => (
              <li
                key={alt.response_case_id}
                className={alt.is_selected ? "rf-oc-ch-alt-item rf-oc-ch-alt-item--selected" : "rf-oc-ch-alt-item"}
              >
                <div className="rf-oc-ch-alt-item__main">
                  <strong>{alt.title}</strong>
                  {alt.is_selected ? (
                    <span className="rf-oc-ch-alt-item__tag">Текущая</span>
                  ) : null}
                </div>
                {alt.description ? <p className="muted rf-oc-ch-alt-item__desc">{alt.description}</p> : null}
                {!alt.is_selected ? (
                  <div className="rf-oc-ch-alt-item__actions">
                    <OpButton
                      type="button"
                      disabled={actionsDisabled}
                      onClick={() => handleOverrideClick(alt.response_case_id)}
                    >
                      {pendingOverrideId === alt.response_case_id ? "Применить выбор" : "Выбрать"}
                    </OpButton>
                  </div>
                ) : null}
                {pendingOverrideId === alt.response_case_id ? (
                  <label className="rf-oc-ch-override-comment">
                    Комментарий (необязательно)
                    <textarea
                      className="rf-oc-search"
                      rows={2}
                      value={overrideComment}
                      onChange={(e) => setOverrideComment(e.target.value)}
                      disabled={actionsDisabled}
                    />
                  </label>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
