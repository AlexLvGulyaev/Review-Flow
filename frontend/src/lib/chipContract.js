/**
 * Chip emoji contract (lab universal contract; reference — AIC chipContract).
 * Every status chip is emoji + label; the emoji replaces the chip dot and
 * repeats in filters and the legend page («Справка → Обозначения»).
 *
 * One emoji — one concept across the console; concept = universal semantic
 * category (waiting / success / error / attention / miss / …), while labels
 * stay screen-specific. Labels are sourced from displayLabels (label SOT);
 * this file is the emoji SOT.
 */

import {
  AUDIT_ROLE_LABELS,
  CONFIDENCE_BAND_LABELS,
  MODERATION_LABELS,
  PRIORITY_LABELS,
  SCENARIO_LABELS,
  SENTIMENT_LABELS,
} from "./displayLabels.js";

const FALLBACK = "—";

const build = (emojiMap, labelMap) =>
  Object.fromEntries(
    Object.entries(emojiMap).map(([code, emoji]) => [
      code,
      { emoji, label: labelMap[code] ?? code },
    ]),
  );

/**
 * Scenario of a review / typsituation — НСИ классификации.
 * Коды = codes активных сценариев в НСИ (InteractionScenario.scenario_code);
 * названия тянутся из НСИ на экранах, здесь только значок и лейбл-фолбэк.
 */
export const SCENARIO = build(
  {
    question: "❓",
    complaint: "🚩",
    gratitude: "💚",
    suggestion: "💡",
  },
  SCENARIO_LABELS,
);

/**
 * Sentiment of a review / НСИ классификации (то же семейство, что SCENARIO).
 * Значок задаётся контрактом (в НСИ поля «иконка» нет); коды — активные
 * тональности НСИ. Набор подобран по различимости: улыбка-смех / ровная /
 * разочарование / красная от злости.
 */
export const SENTIMENT = build(
  {
    positive: "😄",
    neutral: "😐",
    negative: "😞",
    aggressive: "😡",
  },
  SENTIMENT_LABELS,
);

/** Modality of moderation decision on a review / AI draft. */
export const MODERATION = build(
  {
    pending_review: "⏳",
    processing: "🔄",
    approved: "✔︎",
    needs_revision: "⚠️",
    rejected: "❌",
  },
  { ...MODERATION_LABELS, processing: "В процессе" },
);

/** Controlled Hybrid confidence band (gap-based). */
export const CONFIDENCE_BAND = {
  ...build({ high: "🎯", medium: "⚠️", low: "💨" }, CONFIDENCE_BAND_LABELS),
  unknown: { emoji: "➖", label: "Н/д" },
};

/** Operator timeline trace state. */
export const TRACE_STATUS = {
  done: { emoji: "✔︎", label: "готово" },
  current: { emoji: "🔄", label: "текущий" },
  failed: { emoji: "❌", label: "ошибка" },
  todo: { emoji: "⏳", label: "ожидание" },
};

/** Reference-entity availability (scenarios, templates, KB records). */
export const ENTITY_ACTIVE = {
  active: { emoji: "⚡", label: "Активен" },
  inactive: { emoji: "⏸️", label: "Неактивен" },
};

/** Severity ladder of an incoming review. */
export const PRIORITY = build(
  { critical: "🚨", high: "🟠", medium: "🟡", low: "🟢" },
  PRIORITY_LABELS,
);

/** Actor of an audit journal entry (role from access token; «Журнал аудита»).
 *  Клиентский контур (отправка обращения, проверка статуса) и демо-режим
 *  попадают в тот же журнал — аудит = журнал пользовательской активности. */
export const AUDIT_ROLE = build(
  {
    administrator: "🛡️",
    operator: "🎧",
    client: "👤",
    demo: "🎭",
  },
  AUDIT_ROLE_LABELS,
);

/** Chip visual variants (see .ai-status* in index.css). */
export const VARIANT = {
  MUTED: "ai-status--muted",
  ERROR: "ai-status--error",
  SUCCESS: "ai-status--signal--success",
  WARNING: "ai-status--signal--warning",
  INFO: "ai-status--signal--info",
  PRIMARY: "ai-status--signal--primary",
};

/** Log entry status (Обработка: 🟢 готово / ⏳ в обработке / ❌ ошибка). */
export const LOG_STATUS = {
  // Канон AIC (LIFECYCLE_STATUS): исход события — ✔︎/🔄/❌. 🟢 остаётся за
  // HEALTH («Норма», состояние компонента), ⏳ — за DOC_STATUS.pending.
  done: { emoji: "✔︎", label: "успешно" },
  current: { emoji: "🔄", label: "ожидание" },
  failed: { emoji: "❌", label: "ошибка" },
};

/** Concept → variant (signal level): colored only where a reaction is due. */
export const MODERATION_VARIANT = {
  approved: VARIANT.SUCCESS,
  pending_review: VARIANT.INFO,
  processing: VARIANT.MUTED,
  needs_revision: VARIANT.WARNING,
  rejected: VARIANT.ERROR,
};

export const SCENARIO_VARIANT = {
  question: VARIANT.INFO,
  complaint: VARIANT.WARNING,
  gratitude: VARIANT.SUCCESS,
  suggestion: VARIANT.PRIMARY,
};

export const SENTIMENT_VARIANT = {
  positive: VARIANT.SUCCESS,
  neutral: VARIANT.MUTED,
  negative: VARIANT.WARNING,
  aggressive: VARIANT.ERROR,
};

export const CONFIDENCE_BAND_VARIANT = {
  high: VARIANT.SUCCESS,
  medium: VARIANT.WARNING,
  low: VARIANT.MUTED,
  unknown: VARIANT.MUTED,
};

export const AUDIT_ROLE_VARIANT = {
  administrator: VARIANT.PRIMARY,
  operator: VARIANT.INFO,
  client: VARIANT.SUCCESS,
  demo: VARIANT.WARNING,
};

export const TRACE_STATUS_VARIANT = {
  done: VARIANT.SUCCESS,
  current: VARIANT.INFO,
  failed: VARIANT.ERROR,
  todo: VARIANT.MUTED,
};

export const ENTITY_ACTIVE_VARIANT = {
  active: VARIANT.SUCCESS,
  inactive: VARIANT.MUTED,
};

export const PRIORITY_VARIANT = {
  critical: VARIANT.ERROR,
  high: VARIANT.WARNING,
  medium: VARIANT.MUTED,
  low: VARIANT.MUTED,
};

/** Modifies .ai-status to hide the dot: emoji replaces it. */
export const CHIP_NO_DOT = "ai-status--emoji";

export function chipText(chip) {
  if (!chip) return FALLBACK;
  return `${chip.emoji} ${chip.label}`;
}

export function chipEntry(map, key) {
  if (key === null || key === undefined || key === "") return null;
  return map[String(key)] || null;
}

export function chipVariant(map, key) {
  if (!map) return VARIANT.MUTED;
  if (key === null || key === undefined || key === "") return VARIANT.MUTED;
  return map[String(key)] || VARIANT.MUTED;
}

/* Двойная подсказка «Параметр: Значение» (native title; владелец: во всех
   консолях). Имя параметра закреплено за самой картой — WeakMap не создаёт
   видимых ключей в контрактных картах. */
const MAP_FAMILY = new WeakMap([
  [SCENARIO, "Сценарий"],
  [SENTIMENT, "Тональность"],
  [MODERATION, "Модерация"],
  [CONFIDENCE_BAND, "Уверенность"],
  [TRACE_STATUS, "Этап пайплайна"],
  [LOG_STATUS, "Статус обработки"],
  [ENTITY_ACTIVE, "Статус сущности"],
  [PRIORITY, "Приоритет"],
  [AUDIT_ROLE, "Роль"],
]);

/** «Тональность: Агрессивный» — или просто label, если семейства нет. */
export function chipFamilyTitle(map, key) {
  const chip = map?.[key];
  if (!chip) return undefined;
  const family = MAP_FAMILY.get(map);
  return family ? `${family}: ${chip.label}` : chip.label;
}