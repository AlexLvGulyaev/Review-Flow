import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventType, setEventType] = useState("");
  const [reviewId, setReviewId] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eventType) params.set("event_type", eventType);
      if (reviewId.trim()) params.set("review_id", reviewId.trim());
      params.set("limit", "100");
      const res = await apiFetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить логи"));
      setLogs(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventType, reviewId]);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  return (
    <main className="page page-wide">
      <h1>Operational Logs</h1>

      <div className="operator-toolbar">
        <label>
          event_type
          <input
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="draft_generated"
          />
        </label>
        <label>
          review_id
          <input
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
            placeholder="UUID"
          />
        </label>
        <button type="button" onClick={loadLogs} disabled={loading}>
          {loading ? "Загрузка…" : "Применить"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Загрузка…</p>}

      <ul className="timeline">
        {logs.map((log, idx) => (
          <li key={idx} className="timeline-item">
            <div className="timeline-header">
              <span className="badge">{log.event_type}</span>
              <time>{new Date(log.timestamp).toLocaleString()}</time>
            </div>
            {log.review_id && (
              <p className="muted">
                review: <code>{log.review_id}</code>
              </p>
            )}
            <p>{log.message}</p>
            {log.latency_ms != null && (
              <p className="muted">latency: {log.latency_ms} ms</p>
            )}
            {Object.keys(log.metadata || {}).length > 0 && (
              <pre className="metadata-preview">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
      {!loading && logs.length === 0 && <p>Нет событий</p>}
    </main>
  );
}
