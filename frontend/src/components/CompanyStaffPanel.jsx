import { Link } from "react-router-dom";

import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { ROLE_LABELS } from "../lib/role.js";
import { OpButton } from "../ops/components/OpToolbar.jsx";

/** Compact staff footer at bottom of company sidebar. */
export default function CompanyStaffPanel() {
  const { session, logout } = useCompanyAuth();
  if (!session) return null;

  return (
    <footer className="company-staff-footer">
      <div className="company-staff-footer__meta">
        <span className="company-staff-footer__email" title={session.email}>
          {session.email}
        </span>
        <span className="company-staff-footer__role muted">
          {ROLE_LABELS[session.role] || session.role}
        </span>
      </div>
      <OpButton
        type="button"
        className="company-staff-footer__logout"
        onClick={logout}
      >
        Выйти
      </OpButton>
      <Link to="/" className="company-staff-footer__client-link">
        Сайт клиентов
      </Link>
    </footer>
  );
}
