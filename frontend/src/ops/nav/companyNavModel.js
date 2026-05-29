import { ROLES } from "../../lib/role.js";

export function getCompanyNavGroups(role) {
  if (role === ROLES.OPERATOR) {
    return [
      {
        title: "Оператор",
        links: [
          { to: "/operator/reviews", label: "Очередь обращений" },
          // Future placeholders (no backend coupling required for now):
          // { to: "/operator/assigned", label: "Мои задачи" },
          // { to: "/operator/history", label: "История" },
        ],
      },
    ];
  }

  if (role === ROLES.ADMINISTRATOR) {
    return [
      {
        title: "Наблюдаемость",
        links: [
          { to: "/analytics", label: "Аналитика" },
          { to: "/logs", label: "Логи" },
        ],
      },
      {
        title: "Качество и промпты",
        links: [
          { to: "/prompts", label: "Промпты" },
          { to: "/evaluation", label: "Evaluation" },
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
        title: "Настройки",
        links: [{ to: "/settings/ai-providers", label: "Провайдеры AI" }],
      },
    ];
  }

  return [];
}

