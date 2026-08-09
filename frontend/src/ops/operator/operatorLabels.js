/**
 * Operator timeline copy + re-exports from unified display labels.
 * @see ../../lib/displayLabels.js
 */

export {
  labelAiDraftStatus,
  labelDistributionRow,
  labelEntityActive,
  labelModeration,
  labelOperationalEventType,
  labelPriority,
  labelPublication,
  labelRejectionReason,
  labelReviewStatus,
  labelScenario,
  labelSentiment,
  labelTemplateDescriptor,
  MODERATION_LABELS,
  PRIORITY_LABELS,
  PUBLICATION_LABELS,
  SCENARIO_LABELS,
  SENTIMENT_LABELS,
} from "../../lib/displayLabels.js";

export const TIMELINE_STAGE_TITLES = {
  received: "Обращение получено",
  classified: "Классификация завершена",
  template: "Шаблон выбран",
  draft: "Черновик AI сформирован",
  handoff: "Передано оператору",
  edited: "Ответ отредактирован",
  moderation: "Решение модерации",
  published: "Публикация",
};

export const TRACE_STATUS_LABELS = {
  done: "готово",
  current: "текущий",
  failed: "ошибка",
  todo: "ожидание",
};
