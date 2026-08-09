import { useEffect, useState } from "react";

import { OpButton, OpTextarea } from "../components/OpToolbar.jsx";

export function ResponseCaseEditExampleModal({ open, initialText, saving, onClose, onSave }) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setText(initialText ?? "");
    setValidationError(null);
  }, [open, initialText]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError("Введите текст примера.");
      return;
    }
    setValidationError(null);
    onSave(trimmed);
  }

  return (
    <div className="rf-oc-modal-backdrop" role="presentation" onClick={handleBackdrop}>
      <div
        className="rf-oc-modal rf-oc-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-rc-edit-example-title"
      >
        <div className="rf-rc-form-modal__head">
          <h2 id="rf-rc-edit-example-title" className="rf-oc-modal__title">
            Изменить пример
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
              {saving ? "Сохранение…" : "Сохранить"}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
