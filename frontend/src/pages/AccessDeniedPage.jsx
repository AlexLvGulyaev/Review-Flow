import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext.jsx";
import { formatRolesList, ROLE_LABELS } from "../lib/role.js";

function isCompanyPath(path) {
  return (
    path === "/company" ||
    path.startsWith("/operator/") ||
    path.startsWith("/prompts") ||
    path.startsWith("/evaluation") ||
    path.startsWith("/analytics") ||
    path.startsWith("/logs") ||
    path.startsWith("/settings/") ||
    path.startsWith("/admin/")
  );
}

export default function AccessDeniedPage() {
  const { role, setRole, ROLES: roles } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const attemptedPath = state.attemptedPath || "—";
  const allowedRoles = state.allowedRoles || [];
  const requiredLabel = formatRolesList(allowedRoles);
  const companyDenied = attemptedPath !== "—" && isCompanyPath(attemptedPath);

  function handleRoleChange(e) {
    const next = e.target.value;
    setRole(next);
    if (allowedRoles.includes(next) && state.attemptedPath) {
      navigate(state.attemptedPath, { replace: true });
    }
  }

  return (
    <main className="page access-denied-page">
      <h1>Доступ ограничен</h1>

      <section className="access-denied-card">
        {companyDenied ? (
          <p className="notice">
            Этот раздел относится к <strong>внутреннему рабочему пространству компании</strong>.
          </p>
        ) : null}
        <p>
          <strong>Текущая роль:</strong> {ROLE_LABELS[role] || role} ({role})
        </p>
        <p>
          <strong>Для этой страницы требуется роль:</strong> {requiredLabel}
        </p>
        {attemptedPath !== "—" && (
          <p>
            <strong>Запрошенный путь:</strong> <code>{attemptedPath}</code>
          </p>
        )}
        <p className="notice">
          Выберите подходящую роль или вернитесь на главную страницу.
        </p>
      </section>

      <label className="role-selector access-denied-role">
        Сменить роль:{" "}
        <select value={role} onChange={handleRoleChange}>
          {Object.values(roles).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] || r}
            </option>
          ))}
        </select>
      </label>

      <p>
        <Link to="/">← На главную (сайт компании)</Link>
        {" · "}
        <Link to="/company">В рабочее пространство компании</Link>
      </p>
    </main>
  );
}
