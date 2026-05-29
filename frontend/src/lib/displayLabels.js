/**
 * Unified display-label layer for enum/category values.
 * Canonical API/DB values stay English; UI uses these mappings only.
 */

const FALLBACK = "—";

function mapLabel(map, code) {
  if (code === null || code === undefined || code === "") return FALLBACK;
  const key = String(code).trim();
  return map[key] ?? key;
}

/** @type {Record<string, string>} */
export const SCENARIO_LABELS = {
  question: "Вопрос",
  complaint: "Жалоба",
  gratitude: "Благодарность",
  suggestion: "Предложение",
  delivery_delay: "Задержка доставки",
  product_quality: "Качество товара",
  refund_request: "Возврат",
  support_escalation: "Эскалация в поддержку",
};

/** @type {Record<string, string>} */
export const SENTIMENT_LABELS = {
  positive: "Позитивная",
  neutral: "Нейтральная",
  negative: "Негативная",
  aggressive: "Агрессивная",
};

/** @type {Record<string, string>} */
export const PRIORITY_LABELS = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
};

/** @type {Record<string, string>} */
export const MODERATION_LABELS = {
  pending_review: "На проверке",
  approved: "Одобрено",
  rejected: "Отклонено",
  needs_revision: "На доработке",
};

/** @type {Record<string, string>} */
export const PUBLICATION_LABELS = {
  published: "Опубликовано",
  not_published: "Не опубликовано",
  draft: "Черновик",
  failed: "Ошибка публикации",
  pending: "Ожидает",
};

/** @type {Record<string, string>} */
export const AI_DRAFT_STATUS_LABELS = {
  pending_review: "AI: готов к проверке",
  needs_revision: "AI: на доработке",
  rejected: "AI: отклонён",
  approved: "AI: одобрен",
  processing: "AI: обработка",
};

/** @type {Record<string, string>} */
export const REJECTION_REASON_LABELS = {
  classification_error: "Ошибка классификации",
  unsuitable_template: "Неподходящий шаблон",
  history_ignored: "История не учтена",
};

export const WORKFLOW_COMPLETED_TOOLTIP = "Ответ уже отправлен клиенту";

/** @type {Record<string, string>} */
export const REVIEW_STATUS_LABELS = {
  processing: "Мы анализируем ваше обращение",
  pending_review: "Ответ готовится и проверяется специалистом",
  approved: "Ответ утверждён и скоро будет опубликован",
  published: "Ответ опубликован",
  rejected: "Обращение отклонено",
  needs_revision: "Требуется доработка ответа",
};

/** @type {Record<string, string>} */
export const ENTITY_ACTIVE_LABELS = {
  active: "Активен",
  inactive: "Неактивен",
};

/** @type {Record<string, string>} */
export const ACTIVE_FILTER_LABELS = {
  active: "Активные",
  inactive: "Неактивные",
  all: "Все",
};

/** @type {Record<string, string>} */
export const EVENT_TYPE_LABELS = {
  review_received: "Обращение получено",
  phrase_matching_completed: "Сопоставление фраз",
  classification_completed: "Классификация завершена",
  template_selected: "Шаблон выбран",
  draft_generated: "Черновик AI сформирован",
  operator_review_opened: "Открыто оператором",
  moderation_approved: "Модерация: одобрено",
  moderation_rejected: "Модерация: отклонено",
  moderation_revision_requested: "Запрошена доработка",
  ai_draft_rejected: "Черновик AI отклонён",
  mock_publication_completed: "Публикация завершена",
  pipeline_failed: "Ошибка pipeline",
  ai_provider_fallback_used: "Fallback AI-провайдера",
  ai_provider_error: "Ошибка AI-провайдера",
  evaluation_case_created: "Создан evaluation case",
  evaluation_scored: "Оценка сохранена",
  analytics_overview_requested: "Запрос аналитики",
  logs_view_opened: "Открыт журнал логов",
  prompt_version_created: "Версия промпта создана",
  prompt_version_activated: "Версия промпта активирована",
  role_access_denied: "Доступ запрещён",
  admin_phrase_created: "Фраза создана",
  admin_phrase_updated: "Фраза обновлена",
  admin_template_created: "Шаблон создан",
  admin_template_updated: "Шаблон обновлён",
  admin_scenario_updated: "Сценарий обновлён",
  admin_sentiment_updated: "Тональность обновлена",
  ai_provider_settings_updated: "Настройки AI обновлены",
  ai_provider_activated: "AI-провайдер активирован",
  ai_provider_fallback_changed: "Fallback изменён",
  ai_provider_tested: "Тест AI-провайдера",
  deployment_health_checked: "Проверка health",
};

const KB_FIELD_LABELS = {
  scenario: "Сценарий",
  sentiment: "Тональность",
  priority: "Приоритет",
};

export function labelScenario(code) {
  return mapLabel(SCENARIO_LABELS, code);
}

export function labelSentiment(code) {
  return mapLabel(SENTIMENT_LABELS, code);
}

export function labelPriority(code) {
  return mapLabel(PRIORITY_LABELS, code);
}

export function labelModeration(code) {
  return mapLabel(MODERATION_LABELS, code);
}

export function labelPublication(code) {
  return mapLabel(PUBLICATION_LABELS, code);
}

export function labelAiDraftStatus(code) {
  if (!code) return AI_DRAFT_STATUS_LABELS.processing;
  return mapLabel(AI_DRAFT_STATUS_LABELS, code);
}

export function labelRejectionReason(code) {
  return mapLabel(REJECTION_REASON_LABELS, code);
}

export function labelReviewStatus(code) {
  return mapLabel(REVIEW_STATUS_LABELS, code);
}

export function labelEntityActive(isActive) {
  return isActive ? ENTITY_ACTIVE_LABELS.active : ENTITY_ACTIVE_LABELS.inactive;
}

export function labelActiveFilter(code) {
  return mapLabel(ACTIVE_FILTER_LABELS, code);
}

export function labelOperationalEventType(code) {
  return mapLabel(EVENT_TYPE_LABELS, code);
}

export function labelClassificationLine(scenario, sentiment, priority) {
  const s = scenario ? labelScenario(scenario) : FALLBACK;
  const t = sentiment ? labelSentiment(sentiment) : FALLBACK;
  const p = priority ? labelPriority(priority) : FALLBACK;
  return `${s} / ${t} · ${p}`;
}

export function labelKbField(fieldKey, code) {
  if (fieldKey === "scenario") return labelScenario(code);
  if (fieldKey === "sentiment") return labelSentiment(code);
  if (fieldKey === "priority") return labelPriority(code);
  return code || FALLBACK;
}

export function formatKbRoutingLabel(fieldKey, code) {
  const prefix = KB_FIELD_LABELS[fieldKey] || fieldKey;
  return `${prefix}: ${labelKbField(fieldKey, code)}`;
}

export function labelDistributionRow(tableTitle, code) {
  if (tableTitle === "Sentiments") return labelSentiment(code);
  if (tableTitle === "Scenarios") return labelScenario(code);
  if (tableTitle === "Priorities") return labelPriority(code);
  return code ?? FALLBACK;
}

/** Format template identifier for display (canonical parts → Russian labels). */
export function labelTemplateDescriptor(template) {
  if (!template) return null;
  if (template.title?.trim()) return template.title.trim();
  const parts = [
    template.scenario ? labelScenario(template.scenario) : null,
    template.sentiment ? labelSentiment(template.sentiment) : null,
    template.priority ? labelPriority(template.priority) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Pipeline completed: response sent to customer; operator actions must be locked. */
export function isOperatorWorkflowCompleted(item) {
  if (!item) return false;
  return item.moderation_status === "approved" && item.publication_status === "published";
}
