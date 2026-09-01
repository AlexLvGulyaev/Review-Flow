import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import CompanyStaffPanel from "../components/CompanyStaffPanel.jsx";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { isCompanyEntryPath, isCompanyStaffPath } from "../lib/companyPaths.js";
import { getCompanyNavGroups } from "../ops/nav/companyNavModel.js";
import { useRole } from "../context/RoleContext.jsx";

function CompanyNav() {
  const { role } = useRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navGroups = getCompanyNavGroups(role);

  return (
    <nav className="op-nav op-sidebar__nav">
      {navGroups.map((g) => (
        <div key={g.title} className="op-nav-group">
          <div className="op-nav-group-title">{g.title}</div>
          {/* AIC parity .ai-nav__items: items inside a left vertical line.
              Кнопки вместо NavLink: без href браузер не показывает превью
              ссылки внизу при наведении (владелец). Активность — по pathname. */}
          <div className="op-nav-items">
            {g.links.map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => navigate(l.to)}
                className={pathname === l.to ? "op-nav-link active" : "op-nav-link"}
              >
                {l.icon ? <span className="op-nav-link__icon">{l.icon}</span> : null}
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function CompanyShell() {
  const { isDemo } = useCompanyAuth();

  return (
    <div className="op-shell">
      <aside className="op-sidebar op-sidebar--company">
        <div className="op-sidebar__head">
          {/* AIC parity: brand icon box + display font, divider under the head. */}
          <div className="op-brand">
            <span className="op-brand__icon">✅</span>
            <span>Review Flow</span>
          </div>
          {/* AIC parity: demo badge sits under the brand divider, above nav. */}
          {isDemo ? <div className="op-sidebar-demo">🔒 Демо-режим: только просмотр</div> : null}
        </div>
        <CompanyNav />
        <CompanyStaffPanel />
      </aside>
      <div className="op-content">
        {/* AIC parity .ai-header: workspace header with a full-width divider
            and the green brand mark on the right. */}
        <div className="op-header__wrapper">
          <header className="op-header">
            <div>
              <div className="op-header__title">Admin Console</div>
              <div className="op-header__subtitle">FastAPI · консоль наблюдаемости</div>
            </div>
            <div className="op-header__brand">Zerocoder</div>
          </header>
        </div>
        <div className="op-content-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function CompanyLayout() {
  const { isStaffSignedIn } = useCompanyAuth();
  const { pathname } = useLocation();

  if (isCompanyEntryPath(pathname)) {
    return (
      <div className="company-entry-shell">
        <Outlet />
      </div>
    );
  }

  if (!isStaffSignedIn && isCompanyStaffPath(pathname)) {
    return (
      <Navigate
        to="/company"
        replace
        state={{ staffSignInRequired: true, from: pathname }}
      />
    );
  }

  return <CompanyShell />;
}
