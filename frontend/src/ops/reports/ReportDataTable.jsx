export function ReportDataTable({ title, subtitle, columns, rows }) {
  if (!rows?.length) {
    return (
      <div className="rf-rep-table-wrap">
        <h4 className="rf-rep-table-wrap__title">{title}</h4>
        {subtitle ? <p className="rf-rep-table-wrap__subtitle muted">{subtitle}</p> : null}
        <p className="muted">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="rf-rep-table-wrap">
      <h4 className="rf-rep-table-wrap__title">{title}</h4>
      {subtitle ? <p className="rf-rep-table-wrap__subtitle muted">{subtitle}</p> : null}
      <table className="data-table rf-rep-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${title}-${idx}-${row.label}`}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key] ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
