export function ReportSummaryBlock({ text, multiline = false }) {
  if (!text) return null;
  const lines = multiline ? text.split("\n").filter(Boolean) : null;

  return (
    <section className="rf-rep-summary" aria-label="Текстовая сводка">
      <h4 className="rf-rep-summary__title">Сводка</h4>
      {lines && lines.length > 1 ? (
        <ul className="rf-rep-summary__list">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="rf-rep-summary__text">{text}</p>
      )}
    </section>
  );
}
