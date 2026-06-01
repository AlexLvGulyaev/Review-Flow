import { useEffect, useState } from "react";

import { OpButton, OpTextarea } from "../components/OpToolbar.jsx";

export function ResponseCaseCandidateRejectModal({ open, saving, onClose, onConfirm }) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    setComment("");
  }, [open]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm(comment.trim() || null);
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
        aria-labelledby="rf-rc-candidate-reject-title"
      >
        <div className="rf-rc-form-modal__head">
          <h2 id="rf-rc-candidate-reject-title" className="rf-oc-modal__title">
            Отклонить кандидата
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
            Комментарий отклонения
            <OpTextarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={saving}
              placeholder="Необязательно"
            />
          </label>
          <div className="rf-oc-modal__actions">
            <OpButton type="button" className="rf-rc-toolbar__action" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" className="rf-rc-toolbar__action" disabled={saving}>
              {saving ? "Отклонение…" : "Отклонить"}
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
