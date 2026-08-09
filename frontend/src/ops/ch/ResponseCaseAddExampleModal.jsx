import { useEffect, useState } from "react";

import { OpButton, OpTextarea } from "../components/OpToolbar.jsx";

export function ResponseCaseAddExampleModal({ open, saving, onClose, onSave }) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setValidationError(null);
  }, [open]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) {
      setValidationError("Введите текст примера обращения.");
      return;
    }
    setValidationError(null);
    onSave(text.trim());
  }

  return (
    <div
      className="rf-oc-modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="rf-oc-modal rf-oc-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-rc-example-title"
      >
        <div className="rf-rc-form-modal__head">
          <h2 id="rf-rc-example-title" className="rf-oc-modal__title">
            Добавить пример
          </h2>
          <button
            type="button"
            className="rf-rc-form-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <p className="muted rf-oc-modal__hint">Текст попадёт в базу retrieval для данной типовой ситуации.</p>
        <form className="rf-oc-modal__form" onSubmit={handleSubmit}>
          <label className="rf-oc-modal__comment">
            <span>Текст примера</span>
            <OpTextarea rows={4} value={text} onChange={(e) => setText(e.target.value)} disabled={saving} autoFocus />
          </label>
          {validationError ? <div className="error rf-oc-modal__error">{validationError}</div> : null}
          <div className="rf-oc-modal__actions">
            <OpButton type="button" className="rf-rc-toolbar__action" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" className="rf-rc-toolbar__action" disabled={saving}>
              {saving ? "Сохранение…" : "Добавить"}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
