import { OpButton } from "../components/OpToolbar.jsx";

/** Один ряд: вкладки над левой панелью, действия над правой. */
export function ResponseCaseUnifiedToolbar({
  tab,
  candidatesCount,
  onTabChange,
  showCaseActions,
  showCandidateActions,
  candidateIsExample,
  hasSelectedCandidate,
  onCandidateCreate,
  onCandidateMerge,
  onCandidateReject,
  saving,
  loading,
  hasCase,
  isActive,
  onAdd,
  onEdit,
  onRefresh,
  onAddExample,
  onArchive,
  onActivate,
}) {
  return (
    <div className="rf-rc-toolbar" role="toolbar" aria-label="Панель типовых ситуаций">
      <div className="rf-rc-toolbar__left">
        <button
          type="button"
          className={tab === "cases" ? "rf-rc-toolbar__tab active" : "rf-rc-toolbar__tab"}
          onClick={() => onTabChange("cases")}
        >
          Типовые ситуации
        </button>
        <button
          type="button"
          className={tab === "candidates" ? "rf-rc-toolbar__tab active" : "rf-rc-toolbar__tab"}
          onClick={() => onTabChange("candidates")}
        >
          Кандидаты ({candidatesCount})
        </button>
      </div>

      <div className="rf-rc-toolbar__right">
        {showCandidateActions ? (
          <>
            {!candidateIsExample ? (
              <OpButton
                type="button"
                variant="primary"
                className="rf-rc-toolbar__action"
                onClick={onCandidateCreate}
                disabled={!hasSelectedCandidate || loading || saving}
              >
                Создать новую ТС
              </OpButton>
            ) : null}
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              onClick={onCandidateMerge}
              disabled={!hasSelectedCandidate || loading || saving}
            >
              Объединить
            </OpButton>
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              onClick={onCandidateReject}
              disabled={!hasSelectedCandidate || loading || saving}
            >
              Отклонить
            </OpButton>
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              onClick={onRefresh}
              disabled={loading || saving}
            >
              Обновить
            </OpButton>
          </>
        ) : showCaseActions ? (
          <>
            <OpButton type="button" className="rf-rc-toolbar__action" onClick={onAdd} disabled={loading || saving}>
              Добавить
            </OpButton>
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              onClick={onEdit}
              disabled={!hasCase || loading || saving}
            >
              Изменить
            </OpButton>
            {hasCase ? (
              <OpButton
                type="button"
                className="rf-rc-toolbar__action"
                onClick={onAddExample}
                disabled={loading || saving}
              >
                Добавить пример
              </OpButton>
            ) : null}
            {hasCase && isActive ? (
              <OpButton type="button" className="rf-rc-toolbar__action" onClick={onArchive} disabled={saving}>
                Архивировать
              </OpButton>
            ) : null}
            {hasCase && !isActive ? (
              <OpButton type="button" className="rf-rc-toolbar__action" onClick={onActivate} disabled={saving}>
                Активировать
              </OpButton>
            ) : null}
            <OpButton type="button" className="rf-rc-toolbar__action rf-rc-toolbar__action--muted" disabled title="Скоро">
              Клонировать
            </OpButton>
            <OpButton
              type="button"
              className="rf-rc-toolbar__action"
              onClick={onRefresh}
              disabled={loading || saving}
            >
              Обновить
            </OpButton>
          </>
        ) : null}
      </div>
    </div>
  );
}
