import { ROLES } from "../../lib/role.js";

/**
 * Sidebar navigation for the company contour.
 *
 * Sprint 024B: legacy / duplicate items are hidden from the menu but remain
 * reachable by direct URL (/prompts, /evaluation, /settings/ai-providers, …).
 */
export function getCompanyNavGroups(role) {
  if (role === ROLES.OPERATOR) {
    return [
      {
        title: "Операции",
        links: [{ to: "/operator/reviews", label: "Очередь обращений", icon: "📥" }],
      },
      {
        title: "Справка",
        links: [{ to: "/legend", label: "Обозначения", icon: "🗺️" }],
      },
    ];
  }

  // Demo lands on /reports but is allowed on every staff route (read-only),
  // so it gets the same sidebar as the administrator — every section is
  // reachable and rendered read-only (mutations disabled in the workspaces).
  if (role === ROLES.ADMINISTRATOR || role === ROLES.DEMO) {
    return [
      {
        title: "Система",
        links: [{ to: "/settings/system", label: "Системные настройки", icon: "⚙️" }],
      },
      {
        title: "Controlled Hybrid",
        links: [{ to: "/admin/response-cases", label: "Типовые ситуации", icon: "🧩" }],
      },
      {
        title: "Операции",
        links: [{ to: "/operator/reviews", label: "Очередь обращений", icon: "📥" }],
      },
      {
        title: "Наблюдаемость",
        links: [
          { to: "/reports", label: "Отчёты", icon: "📈" },
          { to: "/logs", label: "Логи", icon: "📜" },
          { to: "/audit", label: "Журнал аудита", icon: "📋" },
        ],
      },
      {
        title: "Справка",
        links: [{ to: "/legend", label: "Обозначения", icon: "🗺️" }],
      },
    ];
  }

  return [];
}

/** Hidden from sidebar; routes and pages unchanged (direct URL still works). */
export const HIDDEN_NAV_ROUTES = [
  "/analytics",
  "/admin/ch-quality",
  "/settings/ai-providers",
  "/prompts",
  "/evaluation",
  "/admin/phrases",
  "/admin/templates",
  "/admin/scenarios",
  "/admin/sentiments",
];
