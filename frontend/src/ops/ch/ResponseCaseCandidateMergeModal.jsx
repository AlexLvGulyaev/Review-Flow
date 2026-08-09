import { useEffect, useState } from "react";

import { OpButton, OpSelect } from "../components/OpToolbar.jsx";

export function ResponseCaseCandidateMergeModal({ open, saving, cases, onClose, onConfirm }) {
  const [caseId, setCaseId] = useState("");

  useEffect(() => {
    if (!open) return;
    setCaseId("");
  }, [open]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!caseId) return;
    onConfirm(caseId);
  }

  const activeCases = (cases ?? []).filter((c) => c.is_active !== false);

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
        aria-labelledby="rf-rc-candidate-merge-title"
      >
        <div className="rf-rc-form-modal__head">
          <h2 id="rf-rc-candidate-merge-title" className="rf-oc-modal__title">
            Объединить с типовой ситуацией
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
            Типовая ситуация
            <OpSelect value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={saving}>
              <option value="">— выберите —</option>
              {activeCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </OpSelect>
          </label>
          <div className="rf-oc-modal__actions">
            <OpButton type="button" className="rf-rc-toolbar__action" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" className="rf-rc-toolbar__action" disabled={saving || !caseId}>
              {saving ? "Объединение…" : "Объединить"}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
