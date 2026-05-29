import { useEffect, useState } from "react";

import { OpButton, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";
import { labelPriority, labelScenario, labelSentiment } from "../../lib/displayLabels.js";

const REASONS = [
  {
    id: "classification_error",
    title: "Ошибка классификации",
    description: "Неверно определены сценарий / тональность / приоритет",
  },
  {
    id: "unsuitable_template",
    title: "Неподходящий шаблон ответа",
    description: "При верном С/Т/П выбран слабый шаблон из БД/БЗ.",
  },
  {
    id: "history_ignored",
    title: "Не учтена история обращений",
    description: "LLM проигнорировала предыдущие обращения или lifecycle заказа.",
  },
];

export function RejectionFeedbackModal({
  open,
  detail,
  scenarioOptions = [],
  sentimentOptions = [],
  priorityOptions = [],
  saving,
  onClose,
  onSave,
}) {
  const cls = detail?.classification;
  const [reason, setReason] = useState("classification_error");
  const [scenarioId, setScenarioId] = useState("");
  const [sentimentId, setSentimentId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState(null);

  const llmScenarioId = cls?.scenario?.id ?? "";
  const llmSentimentId = cls?.sentiment?.id ?? "";
  const llmPriorityId = cls?.priority?.id ?? "";

  useEffect(() => {
    if (!open || !detail) return;
    setReason("classification_error");
    setScenarioId(llmScenarioId);
    setSentimentId(llmSentimentId);
    setPriorityId(llmPriorityId);
    setComment("");
    setValidationError(null);
  }, [open, detail?.review_id, llmScenarioId, llmSentimentId, llmPriorityId]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError(null);

    if (reason === "classification_error") {
      const changed =
        (scenarioId && scenarioId !== llmScenarioId) ||
        (sentimentId && sentimentId !== llmSentimentId) ||
        (priorityId && priorityId !== llmPriorityId);
      if (!changed) {
        setValidationError("Измените хотя бы одно поле: сценарий, тональность или приоритет.");
        return;
      }
    }

    onSave({
      rejection_reason: reason,
      operator_corrected_scenario_id:
        reason === "classification_error" && scenarioId !== llmScenarioId ? scenarioId || null : null,
      operator_corrected_sentiment_id:
        reason === "classification_error" && sentimentId !== llmSentimentId ? sentimentId || null : null,
      operator_corrected_priority_id:
        reason === "classification_error" && priorityId !== llmPriorityId ? priorityId || null : null,
      optional_comment: comment.trim() || null,
    });
  }

  function renderRefSelect(label, value, onChange, options, llmId) {
    return (
      <label>
        {label}
        <OpSelect value={value} onChange={(e) => onChange(e.target.value)} disabled={saving}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.id === llmId ? " (LLM)" : ""}
            </option>
          ))}
        </OpSelect>
      </label>
    );
  }

  return (
    <div
      className="rf-oc-modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
      onKeyDown={handleKeyDown}
    >
      <div className="rf-oc-modal" role="dialog" aria-modal="true" aria-labelledby="rf-oc-reject-title">
        <h2 id="rf-oc-reject-title" className="rf-oc-modal__title">
          Причина отклонения ответа AI
        </h2>

        <form className="rf-oc-modal__form" onSubmit={handleSubmit}>
          <fieldset className="rf-oc-modal__reasons">
            <legend className="sr-only">Причина отклонения</legend>
            {REASONS.map((r) => (
              <label key={r.id} className="rf-oc-modal__reason">
                <input
                  type="radio"
                  name="rejection_reason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                />
                <span>
                  <strong>{r.title}</strong>
                  <span className="muted rf-oc-modal__reason-desc">{r.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {reason === "classification_error" ? (
            <div className="rf-oc-modal__classification">
              <p className="muted rf-oc-modal__hint">
                Укажите корректные значения из справочников. Текущие значения LLM предзаполнены — измените
                минимум одно поле.
              </p>
              {renderRefSelect(
                "Сценарий",
                scenarioId,
                setScenarioId,
                scenarioOptions,
                llmScenarioId
              )}
              {renderRefSelect(
                "Тональность",
                sentimentId,
                setSentimentId,
                sentimentOptions,
                llmSentimentId
              )}
              {renderRefSelect(
                "Приоритет",
                priorityId,
                setPriorityId,
                priorityOptions,
                llmPriorityId
              )}
              {cls ? (
                <p className="muted rf-oc-modal__hint">
                  LLM: {labelScenario(cls.scenario)} / {labelSentiment(cls.sentiment)} ·{" "}
                  {labelPriority(cls.priority)}
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="rf-oc-modal__comment">
            Комментарий (необязательно)
            <OpTextarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} disabled={saving} />
          </label>

          {validationError ? <div className="error rf-oc-modal__error">{validationError}</div> : null}

          <div className="rf-oc-modal__actions">
            <OpButton type="button" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
