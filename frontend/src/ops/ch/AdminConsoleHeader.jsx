/** Workspace-level headers (the global console header now lives in
 *  `CompanyLayout` — `op-header`, AIC parity). */
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