import { useEffect, useState } from "react";

import { OpPage } from "../components/OpPage.jsx";
import { OpChip } from "../components/OpChip.jsx";
import { fetchClassificationReference } from "../../lib/classificationReference.js";
import {
  AUDIT_ROLE,
  AUDIT_ROLE_VARIANT,
  CONFIDENCE_BAND,
  CONFIDENCE_BAND_VARIANT,
  ENTITY_ACTIVE,
  ENTITY_ACTIVE_VARIANT,
  LOG_STATUS,
  MODERATION,
  MODERATION_VARIANT,
  PRIORITY,
  PRIORITY_VARIANT,
  SCENARIO,
  SCENARIO_VARIANT,
  SENTIMENT,
  SENTIMENT_VARIANT,
  TRACE_STATUS_VARIANT,
  VARIANT,
  chipEntry,
} from "../../lib/chipContract.js";

/**
 * «Справка → Обозначения» — legend of the lab chip contract: one row per
 * chip (icon → name → explanation). New chip ⇒ a row here (pattern rule).
 */

/* Всплывающий хэлп у заголовка панели: длинные «где используется» уходят в
   поповер (владелец), построчные описания значков остаются в строках. */
function Help({ text }) {
  if (!text) return null;
  return (
    <span className="rf-legend__help" tabIndex={0}>
      ?
      <span className="rf-legend__help-pop">{text}</span>
    </span>
  );
}

function Section({ title, where, rows }) {
  return (
    <div className="rf-legend__panel">
      <h3 className="rf-legend__panel-title">
        {title}
        <Help text={where} />
      </h3>
      {rows.map(({ map, variantMap, code, chip, note }) => (
        <div key={code || chipKey(map, note)} className="rf-legend__row">
          {/* AIC parity: legend chip is emoji-only — the label has its own column. */}
          <OpChip chip={chip || map[code]} variant={chipVariantOf(map, variantMap, code)} emojiOnly iconLg />
          <span className="rf-legend__row-label">{(chip || map[code])?.label ?? note}</span>
          <span className="rf-legend__row-note">{note}</span>
        </div>
      ))}
    </div>
  );
}

function chipVariantOf(map, variantMap, code) {
  if (map && variantMap) return variantMap[code] || VARIANT.MUTED;
  return VARIANT.MUTED;
}

function chipKey(map, note) {
  return `${Object.keys(map)[0]}-${note}`;
}

/* where — проверено поиском по экранам: где реально рендерится семейство
   чипов. Порядок секций задан владельцем: ряд 1 — Модерация, Сценарий,
   Тональность, Приоритет; ряд 2 — Уверенность, Статус сущности (3-колоночная
   сетка). Статус обработки (Логи) возвращён в легенду: «Логи» — отдельный
   экран, статус обращения виден в списке/фильтре/детализации (владелец). */
const SECTIONS = [
  {
    title: "Модерация ответа",
    where: "Очередь обращений: статус проверки — значком в верхней строке айтема, в фильтре и карточке обращения.",
    rows: [
      { map: MODERATION, variantMap: MODERATION_VARIANT, code: "pending_review", note: "ответ ждёт проверки оператором" },
      { map: MODERATION, variantMap: MODERATION_VARIANT, code: "processing", note: "обработка обращения идёт" },
      { map: MODERATION, variantMap: MODERATION_VARIANT, code: "approved", note: "решение положительное" },
      { map: MODERATION, variantMap: MODERATION_VARIANT, code: "needs_revision", note: "требуется доработка" },
      { map: MODERATION, variantMap: MODERATION_VARIANT, code: "rejected", note: "решение отрицательное" },
    ],
  },
  {
    title: "Тональность",
    where: "Очередь обращений: фильтр «Тональность» и классификационные значки в третьей строке айтема и карточке обращения.",
    rows: [
      { map: SENTIMENT, variantMap: SENTIMENT_VARIANT, code: "positive", note: "позитивная" },
      { map: SENTIMENT, variantMap: SENTIMENT_VARIANT, code: "neutral", note: "нейтральная" },
      { map: SENTIMENT, variantMap: SENTIMENT_VARIANT, code: "negative", note: "негативная" },
      { map: SENTIMENT, variantMap: SENTIMENT_VARIANT, code: "aggressive", note: "агрессивная" },
    ],
  },
  {
    title: "Приоритет",
    where: "Очередь обращений: фильтр «Приоритет» и классификационные значки третьей строки айтема.",
    rows: [
      { map: PRIORITY, variantMap: PRIORITY_VARIANT, code: "critical", note: "критический" },
      { map: PRIORITY, variantMap: PRIORITY_VARIANT, code: "high", note: "высокий" },
      { map: PRIORITY, variantMap: PRIORITY_VARIANT, code: "medium", note: "средний" },
      { map: PRIORITY, variantMap: PRIORITY_VARIANT, code: "low", note: "низкий" },
    ],
  },
  {
    title: "Уверенность (Controlled Hybrid)",
    where: "Очередь обращений (band классификации в карточке), вкладка «Кандидаты» в Типовых ситуациях, отчёт CH-качества.",
    rows: [
      { map: CONFIDENCE_BAND, variantMap: CONFIDENCE_BAND_VARIANT, code: "high", note: "совпадение уверенное" },
      { map: CONFIDENCE_BAND, variantMap: CONFIDENCE_BAND_VARIANT, code: "medium", note: "требует внимания оператора" },
      { map: CONFIDENCE_BAND, variantMap: CONFIDENCE_BAND_VARIANT, code: "low", note: "совпадение слабое" },
      { map: CONFIDENCE_BAND, variantMap: CONFIDENCE_BAND_VARIANT, code: "unknown", note: "оценка недоступна" },
    ],
  },
  {
    title: "Участник журнала аудита",
    where:
      "Журнал аудита: значок роли в строке события и в детализации. " +
      "Роль берётся из токена доступа; клиентский контур (отправка обращения, проверка статуса) " +
      "и демо-режим попадают в тот же журнал — с IP-адресом.",
    rows: [
      { map: AUDIT_ROLE, variantMap: AUDIT_ROLE_VARIANT, code: "administrator", note: "действие администратора (мутации НСИ и настроек)" },
      { map: AUDIT_ROLE, variantMap: AUDIT_ROLE_VARIANT, code: "operator", note: "действие оператора (модерация ответов)" },
      { map: AUDIT_ROLE, variantMap: AUDIT_ROLE_VARIANT, code: "client", note: "активность клиента: отправка обращения, проверка статуса" },
      { map: AUDIT_ROLE, variantMap: AUDIT_ROLE_VARIANT, code: "demo", note: "вход/работа в демо-режиме (read-only)" },
    ],
  },
  {
    title: "Статус сущности",
    where: "Типовые ситуации (список и карточка) и База знаний: активна или в архиве.",
    rows: [
      { map: ENTITY_ACTIVE, variantMap: ENTITY_ACTIVE_VARIANT, code: "active", note: "запись активна и участвует в работе" },
      { map: ENTITY_ACTIVE, variantMap: ENTITY_ACTIVE_VARIANT, code: "inactive", note: "запись в архиве (деактивирована)" },
    ],
  },
  {
    title: "Статус обработки (Логи)",
    where: "Логи: значок статуса обращения в строке списка, в детализации и в фильтре «Статус»; на этапах таймлайна — тот же значок у шага.",
    rows: [
      { map: LOG_STATUS, variantMap: TRACE_STATUS_VARIANT, code: "done", note: "обращение прошло pipeline до конца — ответ получен и сохранён" },
      { map: LOG_STATUS, variantMap: TRACE_STATUS_VARIANT, code: "current", note: "обращение ещё обрабатывается пайплайном; итог сменится на «успешно» или «ошибку»" },
      { map: LOG_STATUS, variantMap: TRACE_STATUS_VARIANT, code: "failed", note: "pipeline прервался, ответа нет — причина в блоке «Ошибка» детализации" },
    ],
  },
];

const SCENARIO_WHERE =
  "Значок сценария стоит перед названием типовой ситуации в списке слева. " +
  "Строки — активные сценарии справочника классификации (НСИ); значок — по коду НСИ, " +
  "без соответствия в контракте — запасной 🏷.";

export default function LegendWorkspace() {
  const [classRef, setClassRef] = useState(null);
  useEffect(() => {
    fetchClassificationReference()
      .then(setClassRef)
      .catch(() => setClassRef({ scenarios: [] }));
  }, []);

  /* Секция сценариев — из живой НСИ; лейбл = НСИ-название (или контракт), значок по коду. */
  const scenarioRows = (classRef?.scenarios ?? []).map((sc) => ({
    map: SCENARIO,
    variantMap: SCENARIO_VARIANT,
    code: sc.code,
    chip: chipEntry(SCENARIO, sc.code) || { emoji: "🏷", label: sc.name },
    note: "сценарий обращения",
  }));
  const scenarioSection = {
    title: "Сценарий обращения (НСИ)",
    where: SCENARIO_WHERE,
    rows: scenarioRows,
  };

  return (
    <OpPage>
      {/* Workspace header in the same form/size as the other consoles
          (Очередь обращений, Типовые ситуации, Отчёты). */}
      <div className="rf-oc-workspace-header">
        <h2 className="rf-oc-workspace-header__title rf-legend__title">Обозначения</h2>
        <p className="rf-oc-workspace-header__subtitle rf-legend__intro">
          Единый значковый контракт консоли: значок задаёт смысл статуса и не меняется
          от экрана к экрану. В фильтрах значок стоит рядом с тем же значением.
        </p>
      </div>
      <div className="rf-legend__grid">
        {[SECTIONS[0], scenarioSection, ...SECTIONS.slice(1)].map((s) => (
          <Section key={s.title} title={s.title} where={s.where} rows={s.rows} />
        ))}
      </div>
    </OpPage>
  );
}