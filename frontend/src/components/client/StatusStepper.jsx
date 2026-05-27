const STEPS = [
  "Обращение получено",
  "Классификация и анализ",
  "Формирование ответа",
  "На модерации",
  "Опубликовано",
];

/** Map API client status → active step index (1-based) */
export function getStatusStep(status) {
  switch (status) {
    case "published":
      return 5;
    case "approved":
    case "pending_review":
    case "needs_revision":
    case "rejected":
      return 4;
    case "processing":
      return 3;
    default:
      return 2;
  }
}

export default function StatusStepper({ status }) {
  const active = getStatusStep(status);

  return (
    <ol className="status-stepper" aria-label="Этапы обработки">
      {STEPS.map((label, idx) => {
        const num = idx + 1;
        let state = "todo";
        if (num < active) state = "done";
        else if (num === active) state = "active";

        return (
          <li key={label} className={`status-stepper-item ${state}`}>
            <span className="status-stepper-marker" aria-hidden="true">
              {state === "done" ? "✓" : num}
            </span>
            <span className="status-stepper-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
