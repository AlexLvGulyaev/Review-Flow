/** Idle preview — same stages as live StatusStepper */
const PREVIEW_STEPS = [
  { label: "Обращение получено", done: true },
  { label: "Классификация и анализ", done: true },
  { label: "Формирование ответа", done: false },
  { label: "На модерации", done: false },
  { label: "Опубликовано", done: false },
];

export default function StatusDialogVisual() {
  return (
    <aside className="client-status-dialog-visual client-status-panel-shell" aria-hidden="true">
      <div className="client-status-dialog-illustration">
        <div className="client-status-envelope" />
        <div className="client-status-doc" />
        <div className="client-status-check-badge">✓</div>
      </div>
      <p className="client-status-idle-hint">
        Введите номер обращения и email слева — мы покажем текущий этап обработки и опубликованный
        ответ, если он уже готов.
      </p>
      <ol className="client-status-demo-timeline" aria-hidden="true">
        {PREVIEW_STEPS.map((step) => (
          <li
            key={step.label}
            className={`client-status-demo-step ${step.done ? "done" : "pending"}`}
          >
            <span className="client-status-demo-dot" />
            <span className="client-status-demo-text">
              <strong>{step.label}</strong>
            </span>
          </li>
        ))}
      </ol>
      <p className="client-status-demo-trust">
        <span aria-hidden="true">🛡</span> Мы ценим ваше доверие
      </p>
    </aside>
  );
}
