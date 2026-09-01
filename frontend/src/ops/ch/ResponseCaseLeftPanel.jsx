import { labelActiveFilter, labelScenario } from "../../lib/displayLabels.js";
import { SCENARIO, chipEntry } from "../../lib/chipContract.js";
import { OpInput, OpSelect } from "../components/OpToolbar.jsx";
import { ResponseCaseQueueItem } from "./ResponseCaseQueueItem.jsx";

export function ResponseCaseLeftPanel({
  productAreaFilter,
  onProductAreaFilterChange,
  topicFilter,
  onTopicFilterChange,
  statusFilter,
  onStatusFilterChange,
  scenarioFilter,
  onScenarioFilterChange,
  productAreas,
  topicsForFilter,
  scenarios,
  search,
  onSearchChange,
  filteredCount,
  pageIndex,
  totalPages,
  pageItems,
  loading,
  onRefresh,
  onPrevPage,
  onNextPage,
  onResetPage,
  selectedCaseId,
  onSelectCase,
  error,
  message,
}) {
  const pageHuman = filteredCount === 0 ? 0 : pageIndex + 1;

  return (
    <section className="rf-oc-left card" aria-label="Список типовых ситуаций">
      <div className="rf-oc-filters">
        <div className="rf-oc-filter-row">
          <OpSelect
            className="rf-oc-select"
            value={productAreaFilter}
            onChange={(e) => onProductAreaFilterChange(e.target.value)}
            aria-label="Продукт"
          >
            <option value="">продукт</option>
            {productAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={topicFilter}
            onChange={(e) => onTopicFilterChange(e.target.value)}
            aria-label="Тема"
          >
            <option value="">тема</option>
            {topicsForFilter.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Статус"
          >
            <option value="all">все статусы</option>
            {/* Значки — из чип-контракта (ENTITY_ACTIVE), как у ТС в списке. */}
            <option value="active">⚡ {labelActiveFilter("active")}</option>
            <option value="archived">⏸️ {labelActiveFilter("archived")}</option>
          </OpSelect>
          <OpSelect
            className="rf-oc-select"
            value={scenarioFilter}
            onChange={(e) => onScenarioFilterChange(e.target.value)}
            aria-label="Сценарий"
          >
            <option value="">сценарий</option>
            {scenarios.map((s) => {
              // Значок из чип-контракта по коду НСИ (тот же, что у ТС в списке).
              const emoji = chipEntry(SCENARIO, s.code)?.emoji;
              return (
                <option key={s.id} value={s.id}>
                  {emoji ? `${emoji} ${labelScenario(s)}` : labelScenario(s)}
                </option>
              );
            })}
          </OpSelect>
        </div>

        <OpInput
          className="rf-oc-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск: название, код, тема…"
        />

        {/* AIC operational canon (Диалоги): пагинация над чертой, мета-строка
            «Всего N» + «Сброс»; «Обновить» живёт в тулбаре над панелями. */}
        <div className="rf-oc-page-controls">
          <button
            type="button"
            className="rf-oc-page-btn"
            onClick={onPrevPage}
            disabled={pageIndex <= 0 || !filteredCount}
          >
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
          <span>Всего {filteredCount}</span>
          <button
            type="button"
            className="rf-oc-page-btn rf-oc-page-btn--muted"
            onClick={onResetPage}
            disabled={pageIndex === 0}
          >
            Сброс
          </button>
        </div>

        {error ? <div className="error rf-oc-inline-error">{error}</div> : null}
        {message ? <div className="success-inline rf-oc-inline-msg">{message}</div> : null}
      </div>

      <div className="rf-oc-list">
        {loading && pageItems.length === 0 ? <p className="rf-oc-empty">Загрузка…</p> : null}
        {!loading && filteredCount === 0 ? <p className="rf-oc-empty">Нет типовых ситуаций</p> : null}
        {pageItems.map((item) => (
          <ResponseCaseQueueItem
            key={item.id}
            item={item}
            active={selectedCaseId === item.id}
            onSelect={() => onSelectCase(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
