import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApiDownload, adminApiFetch, readApiError } from "../../lib/api.js";
import { AdminConsoleHeader } from "../ch/AdminConsoleHeader.jsx";
import { OpPage } from "../components/OpPage.jsx";
import { ReportPeriodFilter } from "./ReportPeriodFilter.jsx";
import {
  BusinessProblemsReportView,
  ChQualityReportView,
  CustomerReviewsReportView,
} from "./reportViews.jsx";

import "./reports.css";

const API = "/api/admin/reports";

const REPORTS = [
  { id: "customer-reviews", icon: "📨", title: "Обращения клиентов", endpoint: "customer-reviews" },
  { id: "business-problems", icon: "📊", title: "Бизнес-сводка", endpoint: "business-problems" },
  { id: "ch-quality", icon: "🧠", title: "Качество Controlled Hybrid", endpoint: "ch-quality" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function ReportsWorkspace() {
  const [reportId, setReportId] = useState(REPORTS[0].id);
  const [period, setPeriod] = useState("30");
  const [appliedPeriod, setAppliedPeriod] = useState("30");
  const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
  const [dateTo, setDateTo] = useState(todayIso());
  const [appliedDateFrom, setAppliedDateFrom] = useState(dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(dateTo);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(null);

  const activeReport = useMemo(() => REPORTS.find((r) => r.id === reportId) ?? REPORTS[0], [reportId]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ period: appliedPeriod });
    if (appliedPeriod === "custom") {
      if (appliedDateFrom) params.set("date_from", `${appliedDateFrom}T00:00:00Z`);
      if (appliedDateTo) params.set("date_to", `${appliedDateTo}T23:59:59Z`);
    }
    return params.toString();
  }, [appliedPeriod, appliedDateFrom, appliedDateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch(`${API}/${activeReport.endpoint}?${buildQuery()}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сформировать отчёт"));
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport.endpoint, buildQuery]);

  function applyPeriod() {
    setAppliedPeriod(period);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  }

  async function exportReport(format) {
    setExporting(format);
    setError(null);
    try {
      await adminApiDownload(
        `${API}/${activeReport.endpoint}/export?format=${format}&${buildQuery()}`,
        `${activeReport.endpoint}.${format}`,
      );
    } catch (e) {
      setError(e.message || "Ошибка экспорта");
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    load();
  }, [load, reportId, appliedPeriod, appliedDateFrom, appliedDateTo]);

  function renderReport() {
    if (loading && !data) return <p className="muted">Формирование отчёта…</p>;
    if (error) return <p className="op-error">{error}</p>;
    if (!data) return <p className="muted">Нет данных</p>;
    switch (reportId) {
      case "business-problems":
        return <BusinessProblemsReportView data={data} />;
      case "ch-quality":
        return <ChQualityReportView data={data} />;
      default:
        return <CustomerReviewsReportView data={data} />;
    }
  }

  return (
    <OpPage wide className="op-page--reports">
      <AdminConsoleHeader />
      <div className="rf-oc-workspace-header">
        <h2 className="rf-oc-workspace-header__title">Отчёты</h2>
        <p className="rf-oc-workspace-header__subtitle">
          Управленческая отчётность: обращения, бизнес-сводка и качество Controlled Hybrid
        </p>
      </div>

      <div className="rf-rep-console">
        <nav className="rf-rep-list card" aria-label="Список отчётов">
          <h3 className="rf-rep-list__title">Отчёты</h3>
          <div className="rf-rep-list__items">
            {REPORTS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={r.id === reportId ? "rf-rep-list__item active" : "rf-rep-list__item"}
                onClick={() => setReportId(r.id)}
              >
                {r.icon} {r.title}
              </button>
            ))}
          </div>
        </nav>

        <div className="rf-rep-main">
          <div className="rf-rep-main__head">
            <h3 className="rf-rep-main__title">
              {activeReport.icon} {activeReport.title}
            </h3>
          </div>
          <ReportPeriodFilter
            period={period}
            onPeriodChange={setPeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApply={applyPeriod}
            onRefresh={load}
            loading={loading}
            showExport
            onExport={exportReport}
            exporting={exporting}
          />
          <div className="rf-rep-main__body">{renderReport()}</div>
        </div>
      </div>
    </OpPage>
  );
}
