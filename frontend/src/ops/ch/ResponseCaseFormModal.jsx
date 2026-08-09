import { useEffect } from "react";

import { OpButton } from "../components/OpToolbar.jsx";
import { ResponseCaseEditFields } from "./ResponseCaseDetailPanel.jsx";

export function ResponseCaseFormModal({
  open,
  title,
  submitLabel,
  model,
  setModel,
  catalog,
  classRef,
  topicsForArea,
  isCreate,
  saving,
  onClose,
  onSubmit,
}) {
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
    onSubmit();
  }

  return (
    <div
      className="rf-oc-modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
    >
      <div
        className="rf-oc-modal rf-oc-modal--compact rf-rc-form-modal rf-rc-form-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-rc-form-modal-title"
      >
        <div className="rf-rc-form-modal__head">
          <h2 id="rf-rc-form-modal-title" className="rf-oc-modal__title">
            {title}
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
          <ResponseCaseEditFields
            model={model}
            setModel={setModel}
            catalog={catalog}
            classRef={classRef}
            topicsForArea={topicsForArea}
            isCreate={isCreate}
            saving={saving}
          />
          <div className="rf-oc-modal__actions">
            <OpButton type="button" className="rf-rc-toolbar__action" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" className="rf-rc-toolbar__action" disabled={saving}>
              {saving ? "Сохранение…" : submitLabel}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
