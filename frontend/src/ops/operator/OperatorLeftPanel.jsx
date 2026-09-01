import {
  MODERATION_LABELS,
  PRIORITY_LABELS,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";
import {
  MODERATION,
  PRIORITY,
  SCENARIO,
  SENTIMENT,
  chipEntry,
  chipText,
} from "../../lib/chipContract.js";
import { OpButton, OpInput, OpSelect } from "../components/OpToolbar.jsx";
import { OperatorQueueItem } from "./OperatorQueueItem.jsx";

const MODERATION_FILTER_KEYS = ["", ...Object.keys(MODERATION_LABELS)];
const PRIORITY_FILTER_KEYS = ["", ...Object.keys(PRIORITY_LABELS)];

/** AF `logs-left`: filters row → search row → pagination row → list. */
export function OperatorLeftPanel({
  listRef,
  search,
  onSearchChange,
  moderationFilter,
  onModerationFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  scenarioFilter,
  onScenarioFilterChange,
  sentimentFilter,
  onSentimentFilterChange,
  scenarios,
  sentiments,
  counters,
  filteredCount,
  pageIndex,
  totalPages,
  pageItems,
  loading,
  onRefresh,
  onPrevPage,
  onNextPage,
  onResetPage,
  selectedId,
  onSelect,
  listError,
}) {
  const pageHuman = filteredCount === 0 ? 0 : pageIndex + 1;

  return (
    <section className="rf-oc-left card">
      <div className="rf-oc-filters">
        <div className="rf-oc-filter-row">
          <OpSelect
            className="rf-oc-select"
            value={moderationFilter}
            onChange={(e) => onModerationFilterChange(e.target.value)}
            aria-label="Статус"
          >
            <option value="">все статусы</option>
            {MODERATION_FILTER_KEYS.filter(Boolean).map((key) => (
              <option key={key} value={key}>
                {chipText(chipEntry(MODERATION, key))}
              </option>
            ))}
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            aria-label="Приоритет"
          >
            <option value="">приоритет</option>
            {PRIORITY_FILTER_KEYS.filter(Boolean).map((key) => (
              <option key={key} value={key}>
                {chipText(chipEntry(PRIORITY, key))}
              </option>
            ))}
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={scenarioFilter}
            onChange={(e) => onScenarioFilterChange(e.target.value)}
            aria-label="Сценарий"
          >
            <option value="">сценарий</option>
            {scenarios.map((s) => {
              // Значок из чип-контракта по коду НСИ (как у айтемов очереди).
              const emoji = chipEntry(SCENARIO, s)?.emoji;
              return (
                <option key={s} value={s}>
                  {emoji ? `${emoji} ${labelScenario(s)}` : labelScenario(s)}
                </option>
              );
            })}
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={sentimentFilter}
            onChange={(e) => onSentimentFilterChange(e.target.value)}
            aria-label="Тональность"
          >
            <option value="">тональность</option>
            {sentiments.map((s) => {
              const emoji = chipEntry(SENTIMENT, s)?.emoji;
              return (
                <option key={s} value={s}>
                  {emoji ? `${emoji} ${labelSentiment(s)}` : labelSentiment(s)}
                </option>
              );
            })}
          </OpSelect>
        </div>

        <OpInput
          className="rf-oc-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск: клиент, заказ, текст…"
        />

        {/* Форма Типовых ситуаций / AIC (Диалоги): пагинация над чертой,
            мета-строка «Всего N» + действия справа. */}
        <div className="rf-oc-page-controls">
          <button type="button" className="rf-oc-page-btn" onClick={onPrevPage} disabled={pageIndex <= 0 || !filteredCount}>
            ← Назад
          </button>
          <span className="rf-oc-page-info">
            Страница {pageHuman} из {totalPages || 0}
          </span>
          <button
            type="button"
            className="rf-oc-page-btn"
            onClick={onNextPage}
            disabled={pageIndex >= totalPages - 1 || !filteredCount}
          >
            Вперёд →
          </button>
        </div>

        <div className="rf-oc-filter-meta rf-oc-meta-row">
          <span>
            Всего {filteredCount} · на проверке: {counters.pending}
          </span>
          <span className="rf-oc-filter-meta__actions">
            <OpButton type="button" className="rf-oc-refresh-btn" onClick={onRefresh} disabled={loading}>
              {loading ? "…" : "Обновить"}
            </OpButton>
            <button
              type="button"
              className="rf-oc-page-btn rf-oc-page-btn--muted"
              onClick={onResetPage}
              disabled={pageIndex === 0}
            >
              Сброс
            </button>
          </span>
        </div>

        {listError ? <div className="error rf-oc-inline-error">{listError}</div> : null}
      </div>

      <div className="rf-oc-list" ref={listRef}>
        {loading && pageItems.length === 0 ? <p className="rf-oc-empty">Загрузка очереди…</p> : null}
        {!loading && filteredCount === 0 ? <p className="rf-oc-empty">Нет обращений по фильтрам</p> : null}
        {pageItems.map((item) => (
          <OperatorQueueItem
            key={item.review_id}
            item={item}
            active={selectedId === item.review_id}
            onSelect={() => onSelect(item.review_id)}
          />
        ))}
      </div>
    </section>
  );
}
