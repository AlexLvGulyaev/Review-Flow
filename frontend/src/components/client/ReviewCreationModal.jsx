import { useReviewForm } from "../../hooks/useReviewForm.js";
import ClientModal from "./ClientModal.jsx";
import ReviewFormFields from "./ReviewFormFields.jsx";

export default function ReviewCreationModal({ open, onClose, onCheckStatus }) {
  const review = useReviewForm();

  function handleClose() {
    review.reset();
    onClose();
  }

  async function handleSubmit(e) {
    await review.submit(e);
  }

  function handleCopyNumber() {
    if (!review.displayRequestId) return;
    navigator.clipboard?.writeText(review.displayRequestId);
  }

  function handleCheckStatusClick() {
    const num = review.displayRequestId || review.requestNumber;
    const email = review.submittedEmail;
    handleClose();
    onCheckStatus?.({ requestNumber: num, email });
  }

  const titleId = "review-modal-title";

  return (
    <ClientModal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="client-modal-card client-review-modal">
        <button type="button" className="client-modal-close" onClick={handleClose} aria-label="Закрыть">
          ×
        </button>

        {review.result ? (
          <div className="client-modal-success">
            <h2 id={titleId}>Обращение отправлено</h2>
            <p className="muted">
              Сохраните номер, чтобы проверить статус позже.
            </p>
            <p className="client-modal-ticket-row">
              Ваш номер обращения:{" "}
              <code className="client-ticket">{review.displayRequestId}</code>
            </p>
            <div className="client-modal-actions">
              <button type="button" className="client-btn ghost" onClick={handleClose}>
                Закрыть
              </button>
              <button type="button" className="client-btn ghost" onClick={handleCopyNumber}>
                Скопировать номер
              </button>
              {onCheckStatus ? (
                <button type="button" className="client-btn primary" onClick={handleCheckStatusClick}>
                  Проверить статус
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <header className="client-modal-header">
              <h2 id={titleId}>Новое обращение</h2>
              <p className="muted client-modal-subtitle">
                Расскажите, что у вас случилось — мы ответим в ближайшее время.
              </p>
              <p className="client-modal-helper muted">
                Поля, отмеченные <span className="req">*</span>, обязательны для заполнения
              </p>
            </header>

            <form className="client-modal-form" onSubmit={handleSubmit}>
              <ReviewFormFields
                form={review.form}
                loading={review.loading}
                error={review.error}
                onChange={review.handleChange}
                onRatingChange={review.setRating}
              />

              <div className="client-modal-actions">
                <button
                  type="button"
                  className="client-btn ghost"
                  onClick={handleClose}
                  disabled={review.loading}
                >
                  Отмена
                </button>
                <button type="submit" className="client-btn primary" disabled={review.loading}>
                  {review.loading ? "Отправка…" : "Отправить обращение"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </ClientModal>
  );
}
