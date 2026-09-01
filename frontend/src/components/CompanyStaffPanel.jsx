import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { ROLE_LABELS } from "../lib/role.js";
import { OpButton } from "../ops/components/OpToolbar.jsx";
import useTheme from "../hooks/useTheme.js";

/** Compact staff footer at bottom of company sidebar. */
export default function CompanyStaffPanel() {
  const { session, isDemo, logout } = useCompanyAuth();
  const { theme, toggle } = useTheme();
  if (!session) return null;

  // Demo identity lives in the sidebar-top demo badge; no demo lines here.
  const roleLabel = ROLE_LABELS[session.role] || session.role;
  const label = session.label || roleLabel;
  const showMeta = label !== roleLabel;

  return (
    <footer className="company-staff-footer">
      {showMeta ? (
        <div className="company-staff-footer__meta">
          <span className="company-staff-footer__email" title={label}>
            {label}
          </span>
          <span className="company-staff-footer__role muted">{roleLabel}</span>
        </div>
      ) : null}
      <OpButton
        type="button"
        className="company-staff-footer__theme"
        onClick={toggle}
      >
        <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
        <span>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
      </OpButton>
      <OpButton
        type="button"
        className="company-staff-footer__logout"
        onClick={logout}
      >
        <span aria-hidden="true">🚪</span>
        <span>Выйти</span>
      </OpButton>
    </footer>
  );
}