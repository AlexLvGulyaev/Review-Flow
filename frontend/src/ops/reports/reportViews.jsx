import { OpMetricCard } from "../observability/OpMetricCard.jsx";
import { labelDistributionRow } from "../../lib/displayLabels.js";
import { ReportBarChart } from "./ReportBarChart.jsx";
import { ReportDataTable } from "./ReportDataTable.jsx";
import { ReportDonutChart } from "./ReportDonutChart.jsx";
import { ReportSummaryBlock } from "./ReportSummaryBlock.jsx";

const TOPIC_COLUMNS = [
  { key: "label", label: "Тема" },
  { key: "count", label: "Количество" },
  { key: "share", label: "Доля, %" },
];

function mapDistribution(items, tableTitle) {
  return (items ?? []).map((r) => ({
    label: tableTitle ? labelDistributionRow(tableTitle, r.label) : r.label,
    count: r.count,
  }));
}

export function CustomerReviewsReportView({ data }) {
  if (!data) return null;

  const areaItems = mapDistribution(data.by_product_area);
  const scenarioItems = mapDistribution(data.by_scenario, "Scenarios");
  const sentimentItems = mapDistribution(data.by_sentiment, "Sentiments");
  const priorityItems = mapDistribution(data.by_priority, "Priorities");
  const topicRows = (data.top_topics ?? []).map((r) => ({
    label: r.label,
    count: r.count,
    share: r.share,
  }));

  return (
    <div className="rf-rep-report-body rf-rep-report-body--compact">
      <div className="rf-rep-kpi-grid rf-rep-kpi-grid--compact">
        <OpMetricCard label="Всего обращений" value={data.total_reviews} />
        <OpMetricCard label="Обработано" value={data.processed_reviews} tone="good" />
        <OpMetricCard label="В работе" value={data.in_progress_reviews} tone="warn" />
        <OpMetricCard
          label="Средняя оценка"
          value={data.average_rating != null ? String(data.average_rating) : "—"}
        />
        <OpMetricCard
          label="Среднее время обработки, ч"
          value={data.average_processing_hours != null ? String(data.average_processing_hours) : "—"}
        />
      </div>

      <div className="rf-rep-compact-row">
        <ReportBarChart
          title="Обращения по дням"
          items={data.reviews_by_day}
          maxBars={10}
          compact
        />
        <ReportBarChart title="Продукты" items={areaItems} maxBars={5} compact />
        <ReportBarChart title="Сценарии" items={scenarioItems} maxBars={5} compact />
        <ReportBarChart title="Тональность" items={sentimentItems} maxBars={5} compact />
        <ReportBarChart title="Приоритет" items={priorityItems} maxBars={5} compact />
      </div>

      <ReportDataTable title="ТОП тем обращений" columns={TOPIC_COLUMNS} rows={topicRows} />
      <ReportSummaryBlock text={data.summary} />
    </div>
  );
}

export function BusinessProblemsReportView({ data }) {
  if (!data) return null;

  const emptyMessage = "За выбранный период данные отсутствуют";
  const toItems = (items) =>
    (items ?? []).map((r) => ({ label: r.label, count: r.count, share: r.share }));
  const sumCounts = (items) => (items ?? []).reduce((sum, row) => sum + row.count, 0);

  const complaints = toItems(data.top_complaints);
  const suggestions = toItems(data.top_suggestions);
  const gratitude = toItems(data.top_gratitude);
  const newTopics = toItems(data.new_topics);

  return (
    <div className="rf-rep-report-body rf-rep-report-body--business">
      <div className="rf-rep-kpi-grid rf-rep-kpi-grid--compact">
        <OpMetricCard label="Жалоб" value={sumCounts(complaints)} tone="warn" />
        <OpMetricCard label="Благодарностей" value={sumCounts(gratitude)} tone="good" />
        <OpMetricCard label="Предложений" value={sumCounts(suggestions)} />
        <OpMetricCard label="Новых тем" value={newTopics.length} />
      </div>

      <div className="rf-rep-business-grid">
        <ReportDonutChart
          title="Жалобы клиентов"
          items={complaints}
          palette="warn"
          emptyMessage={emptyMessage}
        />
        <ReportDonutChart
          title="Благодарности"
          items={gratitude}
          palette="good"
          emptyMessage={emptyMessage}
        />
        <ReportDonutChart
          title="Предложения клиентов"
          items={suggestions}
          palette="default"
          emptyMessage={emptyMessage}
        />
        <ReportBarChart
          title="Новые темы"
          items={newTopics}
          maxBars={10}
          ranking
          emptyMessage={emptyMessage}
        />
      </div>

      <ReportSummaryBlock text={data.summary} multiline />
    </div>
  );
}

export function ChQualityReportView({ data }) {
  if (!data) return null;
  const probRows = (data.problematic_cases ?? []).map((r) => ({
    label: r.label,
    count: r.count,
    share: r.share,
  }));

  return (
    <div className="rf-rep-report-body">
      <div className="rf-rep-kpi-grid">
        <OpMetricCard label="Покрытие базы знаний, %" value={data.coverage_pct} />
        <OpMetricCard label="Доля ручных исправлений, %" value={data.override_rate_pct} tone="warn" />
        <OpMetricCard label="Низкая уверенность системы, %" value={data.low_confidence_rate_pct} />
        <OpMetricCard label="Создано типовых ситуаций" value={data.new_cases} />
        <OpMetricCard label="Добавлено retrieval-примеров" value={data.new_examples} />
        <OpMetricCard label="Кандидаты на расширение базы знаний" value={data.candidates_created} />
      </div>
      <div className="rf-rep-charts-grid">
        <ReportBarChart title="Покрытие базы знаний" items={data.coverage_by_day} />
        <ReportBarChart title="Доля ручных исправлений" items={data.override_by_day} />
        <ReportBarChart title="Низкая уверенность системы" items={data.low_confidence_by_day} />
      </div>
      <ReportDataTable
        title={data.problematic_cases_title || "Часто переопределяемые типовые ситуации"}
        subtitle={data.problematic_cases_criterion}
        columns={TOPIC_COLUMNS}
        rows={probRows}
      />
      <ReportSummaryBlock text={data.summary} />
    </div>
  );
}
