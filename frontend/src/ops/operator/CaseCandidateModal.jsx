import { useEffect, useState } from "react";

import { OpButton, OpTextarea } from "../components/OpToolbar.jsx";

export function CaseCandidateModal({ open, saving, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setComment("");
    setValidationError(null);
  }, [open]);

  if (!open) return null;

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setValidationError("Укажите название и описание типовой ситуации.");
      return;
    }
    setValidationError(null);
    onSave({
      proposed_title: title.trim(),
      proposed_description: description.trim(),
      operator_comment: comment.trim() || null,
    });
  }

  return (
    <div
      className="rf-oc-modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="rf-oc-modal" role="dialog" aria-modal="true" aria-labelledby="rf-oc-candidate-title">
        <h2 id="rf-oc-candidate-title" className="rf-oc-modal__title">
          Создать новую типовую ситуацию
        </h2>
        <p className="muted rf-oc-modal__hint">
          Предложение будет передано администратору на рассмотрение. Ответ клиенту останется на проверке до
          утверждения ситуации.
        </p>
        <form className="rf-oc-modal__form" onSubmit={handleSubmit}>
          <label>
            Название
            <OpTextarea
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              placeholder="Краткое название типовой ситуации"
            />
          </label>
          <label>
            Описание
            <OpTextarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              placeholder="Когда применяется эта ситуация"
            />
          </label>
          <label>
            Комментарий оператора
            <OpTextarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={saving}
              placeholder="Необязательно"
            />
          </label>
          {validationError ? <p className="rf-oc-inline-error">{validationError}</p> : null}
          <div className="rf-oc-modal__actions">
            <OpButton type="button" onClick={onClose} disabled={saving}>
              Отмена
            </OpButton>
            <OpButton type="submit" variant="primary" disabled={saving}>
              Отправить на рассмотрение
            </OpButton>
          </div>
        </form>
      </div>
    </div>
  );
}
