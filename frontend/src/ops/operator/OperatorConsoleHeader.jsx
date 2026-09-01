/** Workspace-level headers (the global console header now lives in
 *  `CompanyLayout` — `op-header`, AIC parity). */
export function OperatorWorkspaceHeader() {
  return (
    <div className="rf-oc-workspace-header">
      <h2 className="rf-oc-workspace-header__title">Очередь обращений</h2>
      <p className="rf-oc-workspace-header__subtitle">Журнал модерации обращений</p>
    </div>
  );
}