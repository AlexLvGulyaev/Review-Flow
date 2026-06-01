/** UX-01 — global admin console header (AF operator console pattern). */
export function AdminConsoleHeader() {
  return (
    <header className="rf-oc-global-header">
      <div className="rf-oc-global-header__main">
        <h1 className="rf-oc-global-header__title">Консоль администратора</h1>
        <p className="rf-oc-global-header__subtitle">Конфигурация платформы и управление знаниями</p>
      </div>
      <div className="rf-oc-global-header__brand">Zerocoder</div>
      <div className="rf-oc-global-header__divider" aria-hidden="true" />
    </header>
  );
}

export function ResponseCaseWorkspaceHeader() {
  return (
    <div className="rf-oc-workspace-header">
      <h2 className="rf-oc-workspace-header__title">Типовые ситуации</h2>
      <p className="rf-oc-workspace-header__subtitle">
        Управление типовыми ситуациями, ответами и правилами обработки обращений
      </p>
    </div>
  );
}
