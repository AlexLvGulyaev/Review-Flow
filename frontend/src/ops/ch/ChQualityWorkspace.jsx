import { useCallback, useEffect, useState } from "react";

import { adminApiFetch, readApiError } from "../../lib/api.js";
import {
  labelConfidenceBand,
  labelOperationalEventType,
} from "../../lib/displayLabels.js";
import { OpPage, OpPageHeader } from "../components/OpPage.jsx";
import { OpButton, OpSelect } from "../components/OpToolbar.jsx";
import { OpMetricCard } from "../observability/OpMetricCard.jsx";

const API = "/api/admin/ch-analytics";

function DistributionTable({ title, items, labelFn }) {
  if (!items?.length) return null;
  return (
    <div className="detail-block">
      <h3>{title}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Показатель</th>
            <th>Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={`${title}-${row.label}`}>
              <td>{labelFn ? labelFn(row.label) : row.label}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pct(part, total) {
  if (!total) return "0%";
  return `${Math.round((100 * part) / total)}%`;
}

export default function ChQualityWorkspace() {
  const [days, setDays] = useState(30);
  const [dashboard, setDashboard] = useState(null);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, auditRes] = await Promise.all([
        adminApiFetch(`${API}/dashboard?days=${days}`),
        adminApiFetch(`${API}/audit?days=${days}&limit=100`),
      ]);
      if (!dashRes.ok) throw new Error(await readApiError(dashRes, "Не удалось загрузить аналитику CH"));
      if (!auditRes.ok) throw new Error(await readApiError(auditRes, "Не удалось загрузить аудит CH"));
      setDashboard(await dashRes.json());
      setAudit(await auditRes.json());
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const o = dashboard?.overview;
  const conf = dashboard?.confidence?.overall;
  const ov = dashboard?.overrides;
  const health = dashboard?.kb_health;

  return (
    <OpPage wide>
      <OpPageHeader
        title="Качество Controlled Hybrid"
        subtitle="Наблюдаемость retrieval, confidence, override, кандидатов и здоровья базы знаний."
        actions={
          <>
            <OpSelect value={String(days)} onChange={(e) => setDays(Number(e.target.value))} aria-label="Период">
              <option value="7">7 дней</option>
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
            </OpSelect>
            <OpButton type="button" onClick={load} disabled={loading} variant="primary">
              Обновить
            </OpButton>
          </>
        }
      />

      <div className="op-seg" aria-label="CH quality sections">
        {[
          ["overview", "Обзор"],
          ["confidence", "Confidence"],
          ["cases", "Качество cases"],
          ["misses", "Промахи"],
          ["audit", "Аудит"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "op-seg-btn active" : "op-seg-btn"}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="op-error">{error}</p>}
      {loading && <p className="op-muted">Загрузка…</p>}

      {!loading && dashboard && tab === "overview" && (
        <>
          <div className="op-metrics-grid">
            <OpMetricCard label="Решений (decisions)" value={o?.total_decisions} />
            <OpMetricCard label="Текущих match" value={o?.total_matched_cases} />
            <OpMetricCard
              label="Low confidence"
              value={o?.total_low_confidence}
              tone={o?.total_low_confidence > 5 ? "warn" : "good"}
            />
            <OpMetricCard label="Override" value={o?.total_overrides} />
            <OpMetricCard label="Кандидаты" value={o?.total_candidates} />
            <OpMetricCard label="Кандидаты одобрены" value={o?.approved_candidates} tone="good" />
            <OpMetricCard label="Кандидаты отклонены" value={o?.rejected_candidates} />
          </div>

          <h3 className="op-section-title">Здоровье базы знаний</h3>
          <div className="op-metrics-grid">
            <OpMetricCard label="Активные cases" value={health?.active_cases} tone="good" />
            <OpMetricCard label="В архиве" value={health?.archived_cases} />
            <OpMetricCard label="Примеров (active)" value={health?.total_examples} />
            <OpMetricCard
              label="Coverage"
              value={`${health?.coverage_percent ?? 0}%`}
              hint={`${health?.reviews_with_ch_decision ?? 0} / ${health?.total_reviews ?? 0} reviews`}
            />
            <OpMetricCard
              label="Backlog кандидатов"
              value={health?.candidate_backlog}
              tone={health?.candidate_backlog > 3 ? "warn" : "good"}
            />
            <OpMetricCard
              label="Approval rate"
              value={
                health?.approval_rate_percent != null ? `${health.approval_rate_percent}%` : "—"
              }
            />
          </div>

          <h3 className="op-section-title">Override</h3>
          <p className="op-muted">
            {ov?.override_count ?? 0} override ({ov?.override_percent ?? 0}% от decisions за период)
          </p>
          <DistributionTable
            title="Чаще всего переопределяемые cases"
            items={(ov?.top_overridden_cases ?? []).map((c) => ({
              label: `${c.title} (${c.case_code})`,
              count: c.override_count,
            }))}
          />

          <h3 className="op-section-title">Кандидаты</h3>
          <DistributionTable title="По статусу" items={dashboard.candidates?.by_status} />
          <DistributionTable title="По product area" items={dashboard.candidates?.by_product_area} />
          <DistributionTable title="По теме" items={dashboard.candidates?.by_topic} />
        </>
      )}

      {!loading && dashboard && tab === "confidence" && conf && (
        <>
          <div className="op-metrics-grid">
            <OpMetricCard label="HIGH" value={conf.high} hint={pct(conf.high, conf.total)} tone="good" />
            <OpMetricCard label="MEDIUM" value={conf.medium} hint={pct(conf.medium, conf.total)} tone="warn" />
            <OpMetricCard label="LOW" value={conf.low} hint={pct(conf.low, conf.total)} tone="bad" />
            <OpMetricCard label="Всего оценок" value={conf.total} />
          </div>
          <DistributionTable
            title="Проблемные области (new_case_needed)"
            items={dashboard.confidence?.by_product_area}
          />
          <DistributionTable title="Проблемные темы (new_case_needed)" items={dashboard.confidence?.by_topic} />
        </>
      )}

      {!loading && dashboard && tab === "cases" && (
        <div className="detail-block">
          <h3>Качество типовых ситуаций (сортировка по проблемности)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Область / тема</th>
                <th>Статус</th>
                <th>Hits</th>
                <th>Override</th>
                <th>Feedback</th>
                <th>Candidates</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.case_quality ?? []).map((row) => (
                <tr key={row.case_id}>
                  <td>
                    {row.title}
                    <div className="op-muted">{row.case_code}</div>
                  </td>
                  <td>
                    {row.product_area} · {row.topic}
                  </td>
                  <td>{row.is_active ? "Active" : "Archived"}</td>
                  <td>{row.hit_count}</td>
                  <td>{row.override_count}</td>
                  <td>{row.feedback_count}</td>
                  <td>{row.candidate_count}</td>
                  <td>{row.problem_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && dashboard && tab === "misses" && (
        <div className="detail-block">
          <h3>Unknown / Missed Cases</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>NL-номер</th>
                <th>Детали</th>
                <th>Band</th>
                <th>Область / тема</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.retrieval_misses ?? []).map((row) => (
                <tr key={`${row.review_id}-${row.miss_type}-${row.created_at}`}>
                  <td>{new Date(row.created_at).toLocaleString("ru-RU")}</td>
                  <td>{row.miss_type}</td>
                  <td>{row.request_number || row.review_id?.slice(0, 8)}</td>
                  <td>{row.detail || "—"}</td>
                  <td>{row.confidence_band ? labelConfidenceBand(row.confidence_band) : "—"}</td>
                  <td>
                    {[row.product_area, row.topic].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && audit && tab === "audit" && (
        <div className="detail-block">
          <h3>Аудит CH ({audit.period_days} дн.)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Событие</th>
                <th>Сущность</th>
                <th>Детали</th>
              </tr>
            </thead>
            <tbody>
              {(audit.items ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.created_at).toLocaleString("ru-RU")}</td>
                  <td>{labelOperationalEventType(entry.event_type)}</td>
                  <td>
                    {entry.entity_type || "—"}
                    {entry.entity_id ? ` · ${String(entry.entity_id).slice(0, 8)}` : ""}
                  </td>
                  <td>
                    <code className="op-code-inline">
                      {JSON.stringify(entry.metadata || {}).slice(0, 120)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpPage>
  );
}
