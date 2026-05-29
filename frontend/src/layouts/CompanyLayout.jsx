import { NavLink, Outlet } from "react-router-dom";

import RoleSelector from "../components/RoleSelector.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { ROLES } from "../lib/role.js";
import { getCompanyNavGroups } from "../ops/nav/companyNavModel.js";

function CompanyNav() {
  const { role } = useRole();

  const navGroups = getCompanyNavGroups(role);

  return (
    <nav className="op-nav">
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

export default function CompanyLayout() {
  return (
    <div className="op-shell">
      <aside className="op-sidebar">
        <div>
          <div className="op-brand">Review Flow Operations</div>
          <div className="op-sidebar-meta">Internal workspace</div>
        </div>
        <RoleSelector />
        <CompanyNav />
      </aside>
      <div className="op-content">
        <Outlet />
      </div>
    </div>
  );
}

