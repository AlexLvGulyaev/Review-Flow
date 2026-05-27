import { NavLink, Outlet } from "react-router-dom";

import RoleSelector from "../components/RoleSelector.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { ROLES } from "../lib/role.js";

function CompanyNav() {
  const { role } = useRole();

  const operatorLinks = [{ to: "/operator/reviews", label: "Очередь отзывов" }];
  const adminGroups = [
    {
      title: "Качество и промпты",
      links: [
        { to: "/prompts", label: "Промпты" },
        { to: "/evaluation", label: "Evaluation" },
      ],
    },
    {
      title: "Наблюдаемость",
      links: [
        { to: "/analytics", label: "Аналитика" },
        { to: "/logs", label: "Логи" },
      ],
    },
    {
      title: "База знаний",
      links: [
        { to: "/admin/phrases", label: "Формулировки" },
        { to: "/admin/templates", label: "Шаблоны" },
        { to: "/admin/scenarios", label: "Сценарии" },
        { to: "/admin/sentiments", label: "Тональности" },
      ],
    },
    {
      title: "AI",
      links: [{ to: "/settings/ai-providers", label: "Провайдеры AI" }],
    },
  ];

  return (
    <nav className="company-nav">
      {role === ROLES.OPERATOR && (
        <div className="company-nav-group">
          <div className="company-nav-title">Оператор</div>
          {operatorLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                isActive ? "company-nav-link active" : "company-nav-link"
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}

      {role === ROLES.ADMINISTRATOR &&
        adminGroups.map((g) => (
          <div key={g.title} className="company-nav-group">
            <div className="company-nav-title">{g.title}</div>
            {g.links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  isActive ? "company-nav-link active" : "company-nav-link"
                }
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
    <div className="company-shell">
      <aside className="company-sidebar">
        <div className="company-sidebar-header">
          <div className="company-brand">Review Flow Operations</div>
          <RoleSelector />
        </div>
        <CompanyNav />
        <div className="company-sidebar-footer">
          <p className="muted">Internal workspace</p>
        </div>
      </aside>
      <div className="company-content">
        <Outlet />
      </div>
    </div>
  );
}

