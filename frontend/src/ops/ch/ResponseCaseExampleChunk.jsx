import { OpButton } from "../components/OpToolbar.jsx";

function sourceLabel(example) {
  if (example.source === "from_review") return "Из обращения";
  if (example.source === "operator_confirmed_learning") return "Подтверждение оператора";
  return example.source || "Пример";
}

function statusLabel(isActive) {
  return isActive ? "активен" : "неактивен";
}

/** Карточка retrieval-примера: мета-строка + текст с кнопками в одной линии. */
export function ResponseCaseExampleChunk({ example, saving, onEdit, onDeactivate }) {
  const source = sourceLabel(example);

  return (
    <article className={`rf-rc-chunk${example.is_active ? "" : " rf-rc-chunk--inactive"}`}>
      <div className="rf-rc-chunk__meta-row">
        <span className="rf-rc-chunk__source">{source}</span>
        <span className="rf-rc-chunk__status">{statusLabel(example.is_active)}</span>
      </div>
      <div className="rf-rc-chunk__content-row">
        <p className="rf-rc-chunk__text">{example.example_text}</p>
        {example.is_active ? (
          <div className="rf-rc-chunk__actions">
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              disabled={saving}
              onClick={() => onEdit(example)}
            >
              Изменить
            </OpButton>
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              disabled={saving}
              onClick={() => onDeactivate(example.id)}
            >
              Деактивировать
            </OpButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}
