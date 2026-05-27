import StarRating from "../StarRating.jsx";
import { REVIEW_TOPIC_OPTIONS } from "../../hooks/useReviewForm.js";

export default function ReviewFormFields({ form, loading, error, onChange, onRatingChange }) {
  const descLen = form.review_text.length;

  return (
    <div className="client-review-form-fields">
      <label className="client-modal-field">
        <span className="client-modal-label">
          Номер заказа <span className="req">*</span>
        </span>
        <input
          name="order_number"
          value={form.order_number}
          onChange={onChange}
          disabled={loading}
          placeholder="Например: NL-00481257"
          autoComplete="off"
        />
      </label>

      <label className="client-modal-field">
        <span className="client-modal-label">
          Тема обращения <span className="req">*</span>
        </span>
        <select name="topic" value={form.topic} onChange={onChange} disabled={loading}>
          <option value="">Выберите тему</option>
          {REVIEW_TOPIC_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="client-modal-field">
        <span className="client-modal-label">
          Описание <span className="req">*</span>
        </span>
        <textarea
          name="review_text"
          rows={4}
          value={form.review_text}
          onChange={onChange}
          disabled={loading}
          placeholder="Опишите вашу ситуацию как можно подробнее..."
          maxLength={2000}
        />
        <span className="client-modal-field-hint">
          <span>Минимум 10 символов</span>
          <span>{descLen}/2000</span>
        </span>
      </label>

      <label className="client-modal-field">
        <span className="client-modal-label">
          Email для ответа <span className="req">*</span>
        </span>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          disabled={loading}
          placeholder="Ваш email"
          autoComplete="email"
        />
      </label>

      <label className="client-modal-field">
        <span className="client-modal-label">Как к вам обращаться</span>
        <input
          name="customer_name"
          value={form.customer_name}
          onChange={onChange}
          disabled={loading}
          placeholder="Например: Александр"
          autoComplete="name"
        />
      </label>

      <div className="client-modal-field">
        <span className="client-modal-label">Оцените сервис</span>
        <StarRating
          value={form.rating}
          onChange={onRatingChange}
          label="Оцените сервис"
          id="modal-rating"
          variant="modal"
        />
      </div>

      {error && <p className="error client-modal-error">{error}</p>}

      <div className="client-modal-privacy" role="note">
        <span className="client-modal-privacy-icon" aria-hidden="true">
          🛡
        </span>
        <p>
          Мы гарантируем конфиденциальность ваших данных и используем их только для обработки
          обращения.
        </p>
      </div>
    </div>
  );
}
