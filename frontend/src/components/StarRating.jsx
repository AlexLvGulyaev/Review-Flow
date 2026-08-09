import { useMemo, useState } from "react";

export default function StarRating({
  value,
  onChange,
  label = "Оценка",
  id = "rating",
  variant = "default",
}) {
  const [hover, setHover] = useState(null);
  const stars = useMemo(() => [1, 2, 3, 4, 5], []);

  const shown = hover ?? value ?? 0;
  const isModal = variant === "modal";

  return (
    <div
      className={isModal ? "star-rating star-rating-modal" : "star-rating"}
      aria-labelledby={`${id}-label`}
    >
      {!isModal ? (
        <div className="star-rating-header">
          <span id={`${id}-label`} className="star-rating-label">
            {label} <span className="muted">(необязательно)</span>
          </span>
          {value ? (
            <button
              type="button"
              className="star-rating-clear"
              onClick={() => onChange(null)}
            >
              Сбросить
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="star-rating-modal-row">
        <div className="star-row" role="radiogroup" aria-label={label}>
          {stars.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={(value ?? 0) === n}
              className={n <= shown ? "star on" : "star"}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(n)}
            >
              ★
            </button>
          ))}
        </div>
        {isModal ? (
          <div className="star-rating-scale" aria-hidden="true">
            <span>Очень плохо</span>
            <span>Отлично</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
