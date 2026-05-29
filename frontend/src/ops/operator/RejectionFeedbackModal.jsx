import { useEffect, useMemo, useState } from "react";

import { OpButton, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";
import {
  PRIORITY_LABELS,
  SCENARIO_LABELS,
  SENTIMENT_LABELS,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";

const COMMON_SCENARIOS = Object.keys(SCENARIO_LABELS);
const COMMON_SENTIMENTS = Object.keys(SENTIMENT_LABELS);
const COMMON_PRIORITIES = Object.keys(PRIORITY_LABELS);

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

function uniqOptions(values, current) {
  const set = new Set();
  if (current) set.add(current);
  for (const v of values) if (v) set.add(v);
  return Array.from(set).sort();
}

export function RejectionFeedbackModal({
  open,
  detail,
  scenarioOptions,
  sentimentOptions,
  priorityOptions,
  saving,
  onClose,
  onSave,
}) {
  const cls = detail?.classification;
  const [reason, setReason] = useState("classification_error");
  const [scenario, setScenario] = useState("");
  const [tone, setTone] = useState("");
  const [priority, setPriority] = useState("");
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!open || !detail) return;
    setReason("classification_error");
    setScenario(cls?.scenario || "");
    setTone(cls?.sentiment || "");
    setPriority(cls?.priority || "");
    setComment("");
    setValidationError(null);
  }, [open, detail?.review_id, cls?.scenario, cls?.sentiment, cls?.priority]);

  const scenarioChoices = useMemo(
    () => uniqOptions([...COMMON_SCENARIOS, ...scenarioOptions], cls?.scenario),
    [scenarioOptions, cls?.scenario]
  );
  const toneChoices = useMemo(
    () => uniqOptions([...COMMON_SENTIMENTS, ...sentimentOptions], cls?.sentiment),
    [sentimentOptions, cls?.sentiment]
  );
  const priorityChoices = useMemo(
    () => uniqOptions([...COMMON_PRIORITIES, ...priorityOptions], cls?.priority),
    [priorityOptions, cls?.priority]
  );

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
        (scenario && scenario !== cls?.scenario) ||
        (tone && tone !== cls?.sentiment) ||
        (priority && priority !== cls?.priority);
      if (!changed) {
        setValidationError("Измените хотя бы одно поле: сценарий, тональность или приоритет.");
        return;
      }
    }

    onSave({
      rejection_reason: reason,
      llm_scenario: cls?.scenario ?? null,
      llm_tone: cls?.sentiment ?? null,
      llm_priority: cls?.priority ?? null,
      operator_corrected_scenario: reason === "classification_error" ? scenario || null : null,
      operator_corrected_tone: reason === "classification_error" ? tone || null : null,
      operator_corrected_priority: reason === "classification_error" ? priority || null : null,
      optional_comment: comment.trim() || null,
    });
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
                Укажите корректные значения. Текущие значения LLM предзаполнены — измените минимум одно поле.
              </p>
              <label>
                Сценарий
                <OpSelect value={scenario} onChange={(e) => setScenario(e.target.value)}>
                  {scenarioChoices.map((v) => (
                    <option key={v} value={v}>
                      {labelScenario(v)}
                      {v === cls?.scenario ? " (LLM)" : ""}
                    </option>
                  ))}
                </OpSelect>
              </label>
              <label>
                Тональность
                <OpSelect value={tone} onChange={(e) => setTone(e.target.value)}>
                  {toneChoices.map((v) => (
                    <option key={v} value={v}>
                      {labelSentiment(v)}
                      {v === cls?.sentiment ? " (LLM)" : ""}
                    </option>
                  ))}
                </OpSelect>
              </label>
              <label>
                Приоритет
                <OpSelect value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {priorityChoices.map((v) => (
                    <option key={v} value={v}>
                      {labelPriority(v)}
                      {v === cls?.priority ? " (LLM)" : ""}
                    </option>
                  ))}
                </OpSelect>
              </label>
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
