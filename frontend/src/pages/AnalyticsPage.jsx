import { useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

function DistributionTable({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="detail-block">
      <h3>{title}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/api/analytics/overview");
        if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить аналитику"));
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <main className="page page-wide"><p>Загрузка аналитики…</p></main>;
  if (error) return <main className="page page-wide"><p className="error">{error}</p></main>;
  if (!data) return null;

  return (
    <main className="page page-wide">
      <h1>Analytics Overview</h1>

      <section>
        <h2>Reviews</h2>
        <div className="metrics-grid">
          <MetricCard label="Total" value={data.total_reviews} />
          <MetricCard label="Published" value={data.published_reviews} />
          <MetricCard label="Pending" value={data.pending_reviews} />
          <MetricCard label="Rejected" value={data.rejected_reviews} />
          <MetricCard label="Needs revision" value={data.needs_revision_reviews} />
        </div>
      </section>

      <section>
        <h2>Ratings</h2>
        <div className="metrics-grid">
          <MetricCard
            label="Average rating"
            value={data.average_rating ?? "—"}
          />
        </div>
        <DistributionTable title="Distribution" items={data.ratings_distribution} />
      </section>

      <section>
        <h2>Classification</h2>
        <DistributionTable title="Sentiments" items={data.sentiment_distribution} />
        <DistributionTable title="Scenarios" items={data.scenario_distribution} />
        <DistributionTable title="Priorities" items={data.priority_distribution} />
      </section>

      <section>
        <h2>Prompt / Evaluation</h2>
        <div className="metrics-grid">
          <MetricCard label="Evaluated cases" value={data.evaluated_cases} />
          <MetricCard
            label="Avg operator score"
            value={data.average_operator_score ?? "—"}
          />
        </div>
        {data.active_prompt_versions?.length > 0 && (
          <div className="detail-block">
            <h3>Active prompts</h3>
            <ul>
              {data.active_prompt_versions.map((p) => (
                <li key={`${p.prompt_key}-${p.version}`}>
                  {p.prompt_key} v{p.version} — {p.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2>Pipeline quality</h2>
        <div className="metrics-grid">
          <MetricCard
            label="Fallback rate"
            value={`${((data.fallback_template_rate ?? 0) * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Phrase review rate"
            value={`${((data.phrase_review_rate ?? 0) * 100).toFixed(1)}%`}
          />
        </div>
      </section>
    </main>
  );
}
