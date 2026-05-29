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
  case_retrieval_completed: "Поиск типовой ситуации",
  case_confidence_evaluated: "Оценка уверенности",
  case_decision_recorded: "Решение по ситуации",
  case_retrieval_low_confidence: "Низкая уверенность",
  operator_case_confirmed: "Ситуация подтверждена",
  operator_case_override: "Ситуация изменена оператором",
  case_candidate_created: "Предложена новая ситуация",
  case_candidate_promoted: "Кандидат: создан case",
  case_candidate_merged: "Кандидат: объединён",
  case_candidate_rejected: "Кандидат: отклонён",
  response_case_created: "Case создан (admin)",
  response_case_updated: "Case обновлён (admin)",
  ch_analytics_dashboard_requested: "Запрос аналитики CH",
};

/** @type {Record<string, string>} */
export const CONFIDENCE_BAND_LABELS = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
};

/** @type {Record<string, string>} */
export const DECISION_SOURCE_LABELS = {
  retrieval_auto: "Автоматический подбор",
  retrieval_operator: "Подтверждено оператором",
  operator_override: "Изменено оператором",
  admin_override: "Изменено администратором",
  legacy_migration: "Миграция legacy",
  manual_seed: "Создано вручную",
};

export function labelConfidenceBand(band) {
  if (!band) return FALLBACK;
  return mapLabel(CONFIDENCE_BAND_LABELS, String(band).toLowerCase());
}

export function labelDecisionSource(source) {
  if (!source) return FALLBACK;
  return mapLabel(DECISION_SOURCE_LABELS, source);
}

export function isControlledHybridDetail(detail) {
  return detail?.pipeline_mode === "controlled_hybrid";
}

const KB_FIELD_LABELS = {
  scenario: "Сценарий",
  sentiment: "Тональность",
  priority: "Приоритет",
};

/** Canonical code from API ref object or legacy string. */
export function refCode(ref) {
  if (ref === null || ref === undefined || ref === "") return null;
  if (typeof ref === "string") return ref;
  return ref.code ?? null;
}

/** Human-readable label from API ref (name) or displayLabels fallback. */
export function refName(ref, labelFn) {
  if (ref === null || ref === undefined || ref === "") return FALLBACK;
  if (typeof ref === "string") return labelFn(ref);
  if (ref.name) return ref.name;
  const code = ref.code;
  return code ? labelFn(code) : FALLBACK;
}

export function labelScenario(codeOrRef) {
  return refName(codeOrRef, (code) => mapLabel(SCENARIO_LABELS, code));
}

export function labelSentiment(codeOrRef) {
  return refName(codeOrRef, (code) => mapLabel(SENTIMENT_LABELS, code));
}

export function labelPriority(codeOrRef) {
  return refName(codeOrRef, (code) => mapLabel(PRIORITY_LABELS, code));
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
  const s = labelScenario(scenario);
  const t = labelSentiment(sentiment);
  const p = labelPriority(priority);
  return `${s} / ${t} · ${p}`;
}

export function labelKbField(fieldKey, codeOrRef) {
  if (fieldKey === "scenario") return labelScenario(codeOrRef);
  if (fieldKey === "sentiment") return labelSentiment(codeOrRef);
  if (fieldKey === "priority") return labelPriority(codeOrRef);
  return refCode(codeOrRef) || FALLBACK;
}

export function formatKbRoutingLabel(fieldKey, codeOrRef) {
  const prefix = KB_FIELD_LABELS[fieldKey] || fieldKey;
  return `${prefix}: ${labelKbField(fieldKey, codeOrRef)}`;
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
  ].filter((p) => p && p !== FALLBACK);
  return parts.length ? parts.join(" · ") : null;
}

/** Pipeline completed: response sent to customer; operator actions must be locked. */
export function isOperatorWorkflowCompleted(item) {
  if (!item) return false;
  return item.moderation_status === "approved" && item.publication_status === "published";
}
