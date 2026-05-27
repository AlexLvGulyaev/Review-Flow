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
              Формат: <code>NL-XXXXXXXX-NNN</code>
            </li>
          </ul>
        </div>
      </aside>
    );
  }

  if (phase === "success" && data) {
    const headline = STATUS_HEADLINE[data.status] || data.status;
    const statusNote =
      data.status === "published"
        ? "Ответ опубликован"
        : data.status === "rejected"
          ? "Обращение отклонено"
          : "На проверке";

    return (
      <aside
        className={`${PANEL_SHELL} client-status-panel client-status-panel-result`}
        aria-live="polite"
      >
        <header className="client-status-panel-header">
          <div className="client-status-panel-header-row">
            <code className="client-ticket client-status-panel-ticket-inline">{data.request_number}</code>
            <span className={`client-status-panel-chip client-status-panel-chip--${data.status}`}>
              {statusNote}
            </span>
          </div>
          <p className="client-status-panel-headline">{headline}</p>
        </header>

        <StatusStepper status={data.status} compact />

        <div className="client-status-panel-details">
          <dl className="client-status-panel-meta">
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
            <p className="client-status-clamp-2" title={data.review_text}>
              {data.review_text}
            </p>
          </section>
        </div>

        {data.final_response ? (
          <section className="client-status-panel-response">
            <h3>Ответ компании</h3>
            <p className="client-status-clamp-2" title={data.final_response}>
              {data.final_response}
            </p>
          </section>
        ) : null}
      </aside>
    );
  }

  return <StatusDialogVisual />;
}
