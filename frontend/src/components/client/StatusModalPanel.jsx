import StatusStepper from "./StatusStepper.jsx";
import StatusDialogVisual from "./StatusDialogVisual.jsx";
import { STATUS_HEADLINE, topicLabel } from "../../lib/reviewStatus.js";

const PANEL_SHELL = "client-status-dialog-visual client-status-panel-shell";

export default function StatusModalPanel({ phase, data, error }) {
  if (phase === "idle") {
    return <StatusDialogVisual />;
  }

  if (phase === "loading") {
    return (
      <aside className={`${PANEL_SHELL} client-status-panel client-status-panel-loading-wrap`} aria-live="polite">
        <div className="client-status-panel-loading">
          <p>Загружаем статус обращения…</p>
          <p className="client-status-panel-loading-hint muted">
            Обычно это занимает несколько секунд
          </p>
        </div>
      </aside>
    );
  }

  if (phase === "error") {
    const isNotFound = error?.kind === "not_found";
    return (
      <aside
        className={`${PANEL_SHELL} client-status-panel client-status-panel-error`}
        aria-live="polite"
      >
        <div className="client-status-panel-error-body">
          <div className="client-status-panel-error-icon" aria-hidden="true">
            !
          </div>
          <h3 className="client-status-panel-error-title">
            {isNotFound ? "Обращение не найдено" : "Не удалось проверить статус"}
          </h3>
          <p className="client-status-panel-error-msg">{error?.message}</p>
          <ul className="client-status-panel-hints">
            <li>Проверьте номер обращения</li>
            <li>Проверьте email, указанный при отправке</li>
            <li>
              Используйте формат <code>NL-XXXXXXXX-NNN</code> (например, NL-00500001-001)
            </li>
          </ul>
          <p className="client-status-demo-trust client-status-panel-trust">
            <span aria-hidden="true">🛡</span> Мы ценим ваше доверие и бережно храним ваши данные
          </p>
        </div>
      </aside>
    );
  }

  if (phase === "success" && data) {
    const isPublished = data.status === "published";
    const headline = STATUS_HEADLINE[data.status] || data.status;

    return (
      <aside
        className={`${PANEL_SHELL} client-status-panel client-status-panel-result`}
        aria-live="polite"
      >
        <header className="client-status-panel-header">
          <p className="client-status-panel-eyebrow">Найдено обращение</p>
          <p className="client-status-panel-ticket">
            <code className="client-ticket">{data.request_number}</code>
          </p>
          <p className="client-status-panel-headline">{headline}</p>
        </header>

        <div className="client-status-panel-stepper-wrap">
          <StatusStepper status={data.status} />
        </div>

        <dl className="client-status-panel-meta client-status-panel-meta--stack">
          <div>
            <dt>Тема</dt>
            <dd>{topicLabel(data.product_area)}</dd>
          </div>
          <div>
            <dt>Оценка</dt>
            <dd>{data.rating != null ? `${data.rating} из 5` : "Не указана"}</dd>
          </div>
        </dl>

        <section className="client-status-panel-review">
          <h3>Ваш отзыв</h3>
          <p className="client-status-review-text" title={data.review_text}>
            {data.review_text}
          </p>
        </section>

        {!isPublished && data.status !== "rejected" && (
          <div className="client-info-box client-status-panel-note" role="status">
            <strong>На проверке</strong>
            <p>
              Специалист проверяет ответ перед публикацией. Финальный текст появится здесь, как
              только он будет готов.
            </p>
          </div>
        )}

        {isPublished && (
          <div className="client-info-box success client-status-panel-note" role="status">
            <strong>Спасибо за обратную связь!</strong>
            <p>Мы опубликовали ответ на ваше обращение. Ниже — текст от компании.</p>
          </div>
        )}

        {data.final_response ? (
          <section className="client-status-panel-response">
            <h3>Ответ компании</h3>
            <p className="client-status-review-text" title={data.final_response}>
              {data.final_response}
            </p>
          </section>
        ) : null}

        <p className="client-status-demo-trust client-status-panel-trust">
          <span aria-hidden="true">🛡</span> Мы ценим ваше доверие
        </p>
      </aside>
    );
  }

  return <StatusDialogVisual />;
}
