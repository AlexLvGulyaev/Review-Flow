import {
  MODERATION_LABELS,
  PRIORITY_LABELS,
  labelModeration,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";
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
  error,
  message,
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
                {labelModeration(key)}
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
                {labelPriority(key)}
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
            {scenarios.map((s) => (
              <option key={s} value={s}>
                {labelScenario(s)}
              </option>
            ))}
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={sentimentFilter}
            onChange={(e) => onSentimentFilterChange(e.target.value)}
            aria-label="Тональность"
          >
            <option value="">тональность</option>
            {sentiments.map((s) => (
              <option key={s} value={s}>
                {labelSentiment(s)}
              </option>
            ))}
          </OpSelect>
        </div>

        <OpInput
          className="rf-oc-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск: клиент, заказ, текст…"
        />

        <div className="rf-oc-filter-meta muted">
          <span>
            Стр. {pageHuman} из {totalPages || 0} · всего: {filteredCount} · на проверке: {counters.pending}
          </span>
          <OpButton type="button" className="rf-oc-refresh-btn" onClick={onRefresh} disabled={loading}>
            {loading ? "…" : "Обновить"}
          </OpButton>
        </div>

        <div className="rf-oc-page-controls">
          <button type="button" className="rf-oc-page-btn" onClick={onPrevPage} disabled={pageIndex <= 0 || !filteredCount}>
            ← Предыдущая
          </button>
          <button
            type="button"
            className="rf-oc-page-btn"
            onClick={onNextPage}
            disabled={pageIndex >= totalPages - 1 || !filteredCount}
          >
            Следующая →
          </button>
          <button type="button" className="rf-oc-page-btn rf-oc-page-btn--muted" onClick={onResetPage} disabled={pageIndex === 0}>
            Сброс
          </button>
        </div>

        {error ? <div className="error rf-oc-inline-error">{error}</div> : null}
        {message ? <div className="success-inline rf-oc-inline-msg">{message}</div> : null}
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
