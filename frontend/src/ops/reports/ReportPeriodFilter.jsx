import { OpButton, OpInput, OpSelect } from "../components/OpToolbar.jsx";

const PERIOD_OPTIONS = [
  { value: "today", label: "Сегодня" },
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
  { value: "90", label: "90 дней" },
  { value: "custom", label: "Произвольный" },
];

const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "xlsx", label: "XLSX" },
  { id: "csv", label: "CSV" },
];

export function ReportPeriodFilter({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onRefresh,
  loading,
  saving,
  showExport = false,
  onExport,
  exporting,
}) {
  return (
    <div className="rf-rep-period" role="toolbar" aria-label="Фильтр периода">
      <label className="rf-rep-period__field">
        <span>Период</span>
        <OpSelect value={period} onChange={(e) => onPeriodChange(e.target.value)} disabled={loading}>
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </OpSelect>
      </label>
      {period === "custom" ? (
        <>
          <label className="rf-rep-period__field">
            <span>С</span>
            <OpInput type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} disabled={loading} />
          </label>
          <label className="rf-rep-period__field">
            <span>По</span>
            <OpInput type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} disabled={loading} />
          </label>
        </>
      ) : null}
      <div className="rf-rep-period__actions">
        {showExport ? (
          <div className="rf-rep-period__export" aria-label="Экспорт отчёта">
            {EXPORT_FORMATS.map((f) => (
              <OpButton
                key={f.id}
                type="button"
                className="rf-rc-toolbar__action"
                onClick={() => onExport?.(f.id)}
                disabled={loading || saving || Boolean(exporting)}
              >
                {exporting === f.id ? "…" : f.label}
              </OpButton>
            ))}
          </div>
        ) : null}
        <OpButton type="button" variant="primary" className="rf-rc-toolbar__action" onClick={onApply} disabled={loading || saving}>
          Сформировать
        </OpButton>
        <OpButton type="button" className="rf-rc-toolbar__action" onClick={onRefresh} disabled={loading || saving}>
          Обновить
        </OpButton>
      </div>
    </div>
  );
}
