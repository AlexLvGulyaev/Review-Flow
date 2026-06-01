import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";

import CompanyStaffPanel from "../components/CompanyStaffPanel.jsx";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { isCompanyEntryPath, isCompanyStaffPath } from "../lib/companyPaths.js";
import { getCompanyNavGroups } from "../ops/nav/companyNavModel.js";
import { useRole } from "../context/RoleContext.jsx";

function CompanyNav() {
  const { role } = useRole();

  const navGroups = getCompanyNavGroups(role);

  return (
    <nav className="op-nav op-sidebar__nav">
      {navGroups.map((g) => (
        <div key={g.title}>
          <div className="op-nav-group-title">{g.title}</div>
          {g.links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? "op-nav-link active" : "op-nav-link")}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function CompanyShell() {
  return (
    <div className="op-shell">
      <aside className="op-sidebar op-sidebar--company">
        <div className="op-sidebar__head">
          <div className="op-brand">Review Flow Operations</div>
          <div className="op-sidebar-meta">Internal workspace</div>
        </div>
        <CompanyNav />
        <CompanyStaffPanel />
      </aside>
      <div className="op-content">
        <Outlet />
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
