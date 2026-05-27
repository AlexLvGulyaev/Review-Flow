/** Idle preview steps — same count/labels as live StatusStepper */
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
      <div className="client-status-dialog-illustration client-status-dialog-illustration--compact">
        <div className="client-status-envelope" />
        <div className="client-status-doc" />
        <div className="client-status-check-badge">✓</div>
      </div>
      <p className="client-status-idle-hint">
        После проверки здесь появятся этапы обработки и краткая информация об обращении.
      </p>
      <ol className="client-status-demo-timeline client-status-demo-timeline--compact">
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
