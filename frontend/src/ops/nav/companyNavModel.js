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
        links: [{ to: "/operator/reviews", label: "Очередь обращений" }],
      },
    ];
  }

  if (role === ROLES.ADMINISTRATOR) {
    return [
      {
        title: "Операции",
        links: [{ to: "/operator/reviews", label: "Очередь обращений" }],
      },
      {
        title: "Controlled Hybrid",
        links: [{ to: "/admin/response-cases", label: "Типовые ситуации" }],
      },
      {
        title: "Настройки",
        links: [{ to: "/settings/system", label: "Системные настройки" }],
      },
      {
        title: "Наблюдаемость",
        links: [
          { to: "/reports", label: "Отчёты" },
          { to: "/logs", label: "Логи" },
        ],
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
