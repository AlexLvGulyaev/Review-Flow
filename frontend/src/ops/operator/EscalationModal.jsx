import { useEffect, useState } from "react";

import { OpButton, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";

const REASONS = [
  {
    id: "no_case_fits",
    title: "Ни одна типовая ситуация не подходит",
    description: "Retrieval не нашёл подходящую ТС — предложить новую для администратора.",
  },
  {
    id: "case_correction_needed",
    title: "Требуется корректировка типовой ситуации",
    description: "Выбранная ТС верна по смыслу, но требует правок политики или утверждённого ответа.",
  },
  {
    id: "bad_llm_draft",
    title: "Неудачная адаптация ответа LLM",
    description: "ТС подходит, но черновик LLM слабо адаптирован к обращению.",
  },
];

export function EscalationModal({
  open,
  saving,
  scenarioOptions = [],
  sentimentOptions = [],
  priorityOptions = [],
  onClose,
  onSave,
}) {
  const [reason, setReason] = useState("no_case_fits");
  const [comment, setComment] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [sentimentId, setSentimentId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReason("no_case_fits");
    setComment("");
    setScenarioId(scenarioOptions[0]?.id ?? "");
    setSentimentId(sentimentOptions[0]?.id ?? "");
    setPriorityId(priorityOptions[0]?.id ?? "");
    setValidationError(null);
  }, [open, scenarioOptions, sentimentOptions, priorityOptions]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) {
      setValidationError("Комментарий оператора обязателен.");
      return;
    }
    if (reason === "no_case_fits") {
      if (!scenarioId || !sentimentId || !priorityId) {
        setValidationError("Укажите сценарий, тональность и приоритет для обращения.");
        return;
      }
    }
    setValidationError(null);
    onSave({
      escalation_reason: reason,
      comment: trimmed,
      scenario_id: reason === "no_case_fits" ? scenarioId : null,
      sentiment_id: reason === "no_case_fits" ? sentimentId : null,
      priority_id: reason === "no_case_fits" ? priorityId : null,
    });
  }

  function renderRefSelect(label, value, onChange, options) {
    return (
      <label>
        {label}
        <OpSelect value={value} onChange={(e) => onChange(e.target.value)} disabled={saving}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
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
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="rf-oc-modal" role="dialog" aria-modal="true" aria-labelledby="rf-oc-escalation-title">
        <h2 id="rf-oc-escalation-title" className="rf-oc-modal__title">
          Эскалация типовой ситуации
        </h2>
        <p className="muted rf-oc-modal__hint">
          Эскалация отправляет сигнал администратору по базе ТС. Обработку текущего обращения можно продолжить
          после подтверждения.
        </p>

        <form className="rf-oc-modal__form" onSubmit={handleSubmit}>
          <fieldset className="rf-oc-modal__reasons">
            <legend className="sr-only">Причина эскалации</legend>
            {REASONS.map((r) => (
              <label key={r.id} className="rf-oc-modal__reason">
                <input
                  type="radio"
                  name="escalation_reason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  disabled={saving}
                />
                <span>
                  <strong>{r.title}</strong>
                  <span className="muted rf-oc-modal__reason-desc">{r.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {reason === "no_case_fits" ? (
            <div className="rf-oc-modal__classification">
              <p className="muted rf-oc-modal__hint">
                Укажите итоговые сценарий, тональность и приоритет обращения. Retrieval-предложение не будет
                считаться выбранной типовой ситуацией.
              </p>
              {renderRefSelect("Сценарий", scenarioId, setScenarioId, scenarioOptions)}
              {renderRefSelect("Тональность", sentimentId, setSentimentId, sentimentOptions)}
              {renderRefSelect("Приоритет", priorityId, setPriorityId, priorityOptions)}
            </div>
          ) : null}

          <label className="rf-oc-modal__comment">
            Комментарий оператора
            <OpTextarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={saving}
              required
            />
          </label>

          {validationError ? <div className="error rf-oc-modal__error">{validationError}</div> : null}

          <div className="rf-oc-modal__actions">
            <OpButton type="button" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Сохранение…" : "Подтвердить"}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
