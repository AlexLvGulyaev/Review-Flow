import { useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";
import { OpPage, OpPageHeader } from "../ops/components/OpPage.jsx";
import { OpButton } from "../ops/components/OpToolbar.jsx";
import { labelDistributionRow } from "../lib/displayLabels.js";
import { OpMetricCard } from "../ops/observability/OpMetricCard.jsx";
import { OpInsightCard } from "../ops/observability/OpInsightCard.jsx";

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
              <td>{labelDistributionRow(title, row.label)}</td>
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
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analytics/overview");
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить аналитику"));
      setData(await res.json());
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <OpPage wide>
        <p>Загрузка аналитики…</p>
      </OpPage>
    );
  if (error)
    return (
      <OpPage wide>
        <p className="error">{error}</p>
      </OpPage>
    );
  if (!data) return null;

  const backlog = data.pending_reviews ?? 0;
  const rejected = data.rejected_reviews ?? 0;
  const needsRevision = data.needs_revision_reviews ?? 0;
  const published = data.published_reviews ?? 0;
  const total = data.total_reviews ?? 0;

  const backlogTone = backlog > 20 ? "bad" : backlog > 5 ? "warn" : "good";
  const failureTone = rejected > 10 ? "warn" : "neutral";
  const revisionTone = needsRevision > 10 ? "warn" : "neutral";
  const publishedTone = published > 0 ? "good" : "neutral";

  return (
    <OpPage wide>
      <OpPageHeader
        title="Observability — Analytics"
        subtitle={
          lastLoadedAt
            ? `Operational overview. Last refresh: ${lastLoadedAt.toLocaleString()}`
            : "Operational overview"
        }
        actions={
          <OpButton type="button" onClick={load} disabled={loading} variant="primary">
            Refresh
          </OpButton>
        }
      />

      <section>
        <div className="op-metrics">
          <OpMetricCard label="Total requests" value={total} />
          <OpMetricCard
            label="Moderation backlog"
            value={backlog}
            tone={backlogTone}
            hint="Pending reviews requiring operator action"
          />
          <OpMetricCard label="Published" value={published} tone={publishedTone} />
          <OpMetricCard label="Rejected" value={rejected} tone={failureTone} />
          <OpMetricCard label="Needs revision" value={needsRevision} tone={revisionTone} />
          <OpMetricCard label="Avg rating" value={data.average_rating ?? "—"} />
        </div>
      </section>

      <section style={{ marginBottom: 14 }}>
        <OpInsightCard
          title="Operational signals"
          description="Quick anomalies and investigation entrypoints."
          tone={backlogTone === "bad" ? "bad" : backlogTone === "warn" ? "warn" : "neutral"}
          pills={[
            {
              key: "fallback",
              color: (data.fallback_template_rate ?? 0) > 0.2 ? "orange" : "gray",
              label: `fallback ${(+(data.fallback_template_rate ?? 0) * 100).toFixed(1)}%`,
              title: "Template fallback rate",
            },
            {
              key: "phrase",
              color: (data.phrase_review_rate ?? 0) > 0.2 ? "orange" : "gray",
              label: `phrase ${(+(data.phrase_review_rate ?? 0) * 100).toFixed(1)}%`,
              title: "Needs phrase review rate",
            },
          ]}
        >
          <div className="muted" style={{ fontSize: "0.92rem" }}>
            Use `/logs` to drill into event chains when backlog grows or failure spikes occur.
          </div>
        </OpInsightCard>
      </section>

      <section>
        <div className="op-panel" style={{ minHeight: 0 }}>
          <h2 className="op-panel-title">Distributions</h2>
          <div className="detail-block" style={{ marginTop: 0 }}>
            <DistributionTable title="Ratings" items={data.ratings_distribution} />
            <DistributionTable title="Sentiments" items={data.sentiment_distribution} />
            <DistributionTable title="Scenarios" items={data.scenario_distribution} />
            <DistributionTable title="Priorities" items={data.priority_distribution} />
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14 }}>
        <div className="op-panel" style={{ minHeight: 0 }}>
          <h2 className="op-panel-title">Prompt / Evaluation</h2>
          <div className="op-metrics" style={{ marginBottom: 0 }}>
            <OpMetricCard label="Evaluated cases" value={data.evaluated_cases} />
            <OpMetricCard label="Avg operator score" value={data.average_operator_score ?? "—"} />
          </div>
          {data.active_prompt_versions?.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                Active prompts
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.active_prompt_versions.map((p) => (
                  <li key={`${p.prompt_key}-${p.version}`}>
                    <strong>{p.prompt_key}</strong> v{p.version} — {p.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </OpPage>
  );
}
