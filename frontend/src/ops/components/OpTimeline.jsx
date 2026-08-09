function traceBadgeClass(status) {
  if (status === "failed") return "op-trace-badge op-trace-badge--failed";
  if (status === "done") return "op-trace-badge op-trace-badge--done";
  if (status === "current") return "op-trace-badge op-trace-badge--current";
  return "op-trace-badge";
}

function traceStatusLabel(status) {
  if (status === "failed") return "failed";
  if (status === "done") return "done";
  if (status === "current") return "current";
  return "pending";
}

export function OpTimeline({ events, variant = "default" }) {
  if (!events?.length) return null;

  if (variant === "trace") {
    return (
      <ul className="op-timeline op-timeline--trace">
        {events.map((e) => (
          <li key={e.key} className={`op-trace-row op-trace-row--${e.status || "todo"}`}>
            <div className="op-trace-line1">
              <span className="op-trace-time">{e.meta || "—"}</span>
              <span className={`op-trace-dot op-trace-dot--${e.status || "todo"}`} aria-hidden />
              <span className="op-trace-label">{e.title}</span>
              <span className={traceBadgeClass(e.status)}>
                {e.statusLabel || traceStatusLabel(e.status)}
              </span>
              {e.latency ? <span className="op-trace-latency">{e.latency}</span> : null}
            </div>
            {e.details || e.subtitle ? (
              <details className="op-trace-details">
                <summary>{e.detailsPreview || e.subtitle || "Details"}</summary>
                {e.details ? <pre className="op-trace-details-pre">{e.details}</pre> : null}
                {!e.details && e.subtitle ? <p className="op-trace-details-text">{e.subtitle}</p> : null}
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="op-timeline">
      {events.map((e) => {
        const statusClass =
          e.status === "failed"
            ? "op-timeline-item op-timeline-item--failed"
            : e.status === "done"
              ? "op-timeline-item op-timeline-item--done"
              : e.status === "current"
                ? "op-timeline-item op-timeline-item--current"
                : "op-timeline-item";

        return (
          <li key={e.key} className={statusClass}>
            <div className="op-timeline-head">
              <p className="op-timeline-title">{e.title}</p>
              {e.meta ? <span className="op-timeline-meta">{e.meta}</span> : null}
            </div>
            {e.subtitle ? <div className="op-card-secondary">{e.subtitle}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
