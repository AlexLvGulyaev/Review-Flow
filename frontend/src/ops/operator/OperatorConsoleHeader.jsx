/** Sprint 020G — sticky global operator console header. */
export function OperatorConsoleHeader() {
  return (
    <header className="rf-oc-global-header">
      <div className="rf-oc-global-header__main">
        <h1 className="rf-oc-global-header__title">Операторская консоль</h1>
        <p className="rf-oc-global-header__subtitle">Рабочее пространство обработки клиентских обращений</p>
      </div>
      <div className="rf-oc-global-header__brand">Zerocoder</div>
      <div className="rf-oc-global-header__divider" aria-hidden="true" />
    </header>
  );
}

export function OperatorWorkspaceHeader() {
  return (
    <div className="rf-oc-workspace-header">
      <h2 className="rf-oc-workspace-header__title">Очередь обращений</h2>
      <p className="rf-oc-workspace-header__subtitle">Журнал модерации обращений</p>
    </div>
  );
}
