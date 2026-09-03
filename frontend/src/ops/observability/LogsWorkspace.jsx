import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { labelOperationalEventType } from "../../lib/displayLabels.js";
import { adminApiDownload, adminApiFetch, readApiError } from "../../lib/api.js";
import { LOG_STATUS, TRACE_STATUS_VARIANT } from "../../lib/chipContract.js";
import { OpPage } from "../components/OpPage.jsx";
import { OpChipFor } from "../components/OpChip.jsx";
import { formatTs, isoDateFrom, PAGE_SIZE, paginate, shortId, WINDOW_OPTIONS } from "./observabilityShared.js";

import "./observability.css";

/**
 * «Логи» — проекция по обращениям (канон AIC OperationalLogs): одна строка
 * списка = одно обращение. Детализация (AIC «ДЕТАЛИЗАЦИЯ ЗАПРОСА») =
 * «Параметры» → «Цепочка обработки» → «Запрос пользователя» / «Ответ системы»
 * → «Ошибка» → «Таймлайн pipeline» (карточки этапов + JSON payload) →
 * «Технический снимок (JSON)».
 */

// Канон чип-контракта (LOG_STATUS): ✔︎ успешно / ❌ ошибка / 🔄 ожидание.
const STATUS_OPTIONS = [
  { value: "ok", label: "✔︎ успешно" },
  { value: "error", label: "❌ ошибка" },
  { value: "pending", label: "🔄 ожидание" },
];

const STATUS_CHIP = { ok: "done", error: "failed", pending: "current" };

/* AIC SectionBox / CompactRow: узкая колонка label + значение (или «—»).
   bare — контент напрямую в секции (без kv-колонок: Запрос/Ответ). */
function SectionBox({ title, children, bare = false }) {
  return (
    <div className="rf-obs-sectionbox">
      <h4 className="rf-obs-sectionbox__title">{title}</h4>
      {bare ? children : <dl className="rf-oc-kv-list">{children}</dl>}
    </div>
  );
}

function CompactRow({ label, value, mono = false }) {
  return (
    <>
      <dt>{label}:</dt>
      <dd className={mono ? "rf-obs-monospace" : undefined}>{value || "—"}</dd>
    </>
  );
}

/* AIC details-блок JSON payload (этап таймлайна, технический снимок). */
function JsonDetails({ summary, payload }) {
  return (
    <details className="rf-obs-json">
      <summary className="rf-obs-json__summary">{summary}</summary>
      <pre className="rf-obs-json__pre">
        {payload == null ? "—" : JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

function LogItem({ trace, active, onSelect }) {
  return (
    <button
      type="button"
      className={active ? "rf-oc-item rf-oc-item--selected" : "rf-oc-item"}
      onClick={onSelect}
      data-trace-id={trace.review_id}
    >
      <div className="rf-oc-item__row rf-oc-item__row--head">
        <span className="rf-oc-item__ts">{formatTs(trace.created_at)}</span>
        <OpChipFor
          map={LOG_STATUS}
          variantMap={TRACE_STATUS_VARIANT}
          code={STATUS_CHIP[trace.status] || "current"}
          emojiOnly
        />
      </div>
      {/* «одна строка — один размер шрифта»: суть входа в отдельной строке */}
      <div className="rf-oc-item__preview">{trace.request_number || "#—"}</div>
      <div className="rf-oc-item__row rf-oc-item__telemetry">
        <span>{trace.model_name || "—"}</span>
        <span className="rf-oc-item__meta">#{shortId(trace.review_id)}</span>
        <span>{trace.latency_ms != null ? `${trace.latency_ms} мс` : "—"}</span>
      </div>
    </button>
  );
}

export default function LogsWorkspace() {
  const [windowLabel, setWindowLabel] = useState("24h");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // AIC nav: выбор элемента после перехода страницы стрелками.
  const pendingPageSelectIndexRef = useRef(null);

  const windowOptions = WINDOW_OPTIONS;

  // Фильтры применяются сразу (AIC-канон); смена фильтра сбрасывает страницу.
  useEffect(() => {
    setPageIndex(0);
  }, [windowLabel, statusFilter, searchFilter]);

  // dateFrom зависит ТОЛЬКО от окна времени (см. KB-паттерн refetch-цикла).
  const dateFrom = useMemo(() => {
    const window = windowOptions.find((w) => w.label === windowLabel);
    return isoDateFrom(window ? window.value : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowLabel]);
  // Пагинация от актуальных total/pageIndex (раньше мемо только по windowLabel
  // оставлял totalPages=1 — вторая страница была недостижима).
  const { totalPages, safePage } = paginate(total, pageIndex);

  const listParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (statusFilter) params.set("status", statusFilter);
    if (searchFilter.trim()) params.set("request_number", searchFilter.trim());
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(safePage * PAGE_SIZE));
    return params.toString();
  }, [dateFrom, statusFilter, searchFilter, safePage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch(`/api/logs?${listParams}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить логи"));
      const data = await res.json();
      const items = data.items || [];
      setTraces(items);
      setTotal(data.total || 0);
      if (pendingPageSelectIndexRef.current != null) {
        const idx = pendingPageSelectIndexRef.current;
        pendingPageSelectIndexRef.current = null;
        const target = items[idx] || items[0];
        if (target?.review_id) setSelectedId(target.review_id);
      }
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
      setTraces([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    load();
  }, [load]);

  function resetFilters() {
    setWindowLabel("24h");
    setStatusFilter("");
    setSearchFilter("");
    setPageIndex(0);
  }

  const filtersDirty = windowLabel !== "24h" || Boolean(statusFilter) || Boolean(searchFilter);

  useEffect(() => {
    if (!traces.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !traces.some((t) => String(t.review_id) === String(selectedId))) {
      setSelectedId(traces[0].review_id);
    }
  }, [traces, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const res = await adminApiFetch(`/api/logs/${selectedId}`);
        if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить трейс"));
        const d = await res.json();
        if (!cancelled) setDetail(d);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // AIC: стрелки вверх/вниз по списку с переходом через страницы.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const t = e.target;
      if (t && (t.closest("input") || t.closest("textarea") || t.closest("select") || t.isContentEditable)) return;
      const curIdx = selectedId ? traces.findIndex((x) => String(x.review_id) === String(selectedId)) : 0;
      if (curIdx < 0) return;
      if (e.key === "ArrowDown") {
        if (curIdx + 1 < traces.length) {
          e.preventDefault();
          setSelectedId(traces[curIdx + 1].review_id);
          return;
        }
        if (safePage + 1 < totalPages) {
          e.preventDefault();
          pendingPageSelectIndexRef.current = 0;
          setPageIndex(safePage + 1);
        }
        return;
      }
      if (curIdx > 0) {
        e.preventDefault();
        setSelectedId(traces[curIdx - 1].review_id);
        return;
      }
      if (safePage > 0) {
        e.preventDefault();
        pendingPageSelectIndexRef.current = PAGE_SIZE - 1;
        setPageIndex(safePage - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [traces, selectedId, safePage, totalPages]);

  // AIC: выбранная строка всегда видна в списке.
  useEffect(() => {
    if (!selectedId) return;
    const list = document.querySelector(".rf-oc-list");
    if (!list) return;
    const row = list.querySelector(`[data-trace-id="${String(selectedId).replace(/"/g, '\\"')}"]`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }, [selectedId, traces]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams(listParams);
      params.delete("limit");
      params.delete("offset");
      await adminApiDownload(
        `/api/logs/export?${params.toString()}`,
        `rf_logs_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (e) {
      setError(e.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  const rows = detail ? (
    <>
      <div className="rf-obs-detail-head">
        <h3 className="rf-obs-detail-title">ДЕТАЛИЗАЦИЯ ЗАПРОСА</h3>
        <div className="rf-obs-detail-chips">
          <OpChipFor
            map={LOG_STATUS}
            variantMap={TRACE_STATUS_VARIANT}
            code={STATUS_CHIP[detail.status] || "current"}
            emojiOnly
          />
        </div>
      </div>

      <div className="rf-obs-detail-grid">
        <SectionBox title="Параметры запроса">
          <CompactRow label="Номер обращения" value={detail.request_number} />
          <CompactRow label="ID обращения" value={detail.review_id} mono />
          <CompactRow label="Дата обращения" value={formatTs(detail.created_at)} />
        </SectionBox>

        <SectionBox title="Параметры исполнения">
          <CompactRow label="Latency pipeline" value={detail.latency_ms != null ? `${detail.latency_ms} мс` : "—"} />
          <CompactRow label="Модель" value={detail.model_name || "—"} />
          <CompactRow label="Модерация" value={detail.moderation_status || "—"} />
          <CompactRow label="Публикация" value={detail.publication_status || "—"} />
        </SectionBox>
      </div>

      {/* Цепочка этапов обработки (AIC): текстовая сводка. */}
      {detail.stages.length ? (
        <div className="rf-obs-sectionbox">
          <h4 className="rf-obs-sectionbox__title">Цепочка обработки</h4>
          <p className="rf-obs-summary-line">{detail.pipeline_summary}</p>
        </div>
      ) : null}

      {/* Трейс обращения: вход → выход (AIC «Запрос пользователя»/«Ответ системы»). */}
      <div className="rf-obs-detail-grid">
        <SectionBox title="Запрос пользователя" bare>
          <pre className="rf-obs-pre rf-obs-pre--answer">{detail.request_text || "—"}</pre>
        </SectionBox>
        <SectionBox title="Ответ системы" bare>
          <pre className="rf-obs-pre rf-obs-pre--answer">{detail.response_text || "—"}</pre>
        </SectionBox>
      </div>

      {detail.error ? (
        <div className="rf-obs-sectionbox rf-obs-sectionbox--error">
          <h4 className="rf-obs-sectionbox__title">Ошибка</h4>
          <pre className="rf-obs-pre">{detail.error}</pre>
        </div>
      ) : null}

      {/* AIC: таймлайн pipeline — последняя панель, карточки этапов
          (время → статус → этап → offset → +latency) + JSON payload этапа. */}
      {detail.stages.length ? (
        <div className="rf-obs-sectionbox rf-obs-sectionbox--timeline">
          <h4 className="rf-obs-sectionbox__title">Таймлайн pipeline</h4>
          <div className="rf-obs-stages">
            {(() => {
              let offsetMs = 0;
              return detail.stages.map((s, i) => {
                const stageOffset = offsetMs;
                if (s.latency_ms != null) offsetMs += s.latency_ms;
                return (
                  <div key={i} className="rf-obs-stage">
                    <div className="rf-obs-stage__row">
                      <span className="rf-obs-stage__ts">{formatTs(s.created_at)}</span>
                      <OpChipFor
                        map={LOG_STATUS}
                        variantMap={TRACE_STATUS_VARIANT}
                        code={s.status === "error" ? "failed" : "done"}
                        emojiOnly
                      />
                      <span className="rf-obs-stage__label">{labelOperationalEventType(s.event_type)}</span>
                      <span className="rf-obs-stage__offset">+{stageOffset} мс</span>
                      <span className="rf-obs-stage__lat">+{s.latency_ms != null ? s.latency_ms : "—"}</span>
                    </div>
                    <JsonDetails summary="JSON payload" payload={s.metadata} />
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : null}

      <JsonDetails summary="Технический снимок (JSON)" payload={detail} />
    </>
  ) : (
    <p className="rf-oc-empty">{detailLoading ? "Загрузка деталей…" : "Выберите обращение для просмотра деталей."}</p>
  );

  return (
    <OpPage wide className="op-page--operator-full op-page--obs-full">
      <div className="rf-oc-workspace-header">
        <div>
          <h2 className="rf-oc-workspace-header__title">Логи</h2>
          <p className="rf-oc-workspace-header__subtitle">Операционная консоль обработки обращений</p>
        </div>
        <div className="rf-obs-meta-actions">
          <button type="button" className="rf-oc-page-btn" onClick={handleExport} disabled={exporting || loading}>
            {exporting ? "Экспорт…" : "Экспорт CSV"}
          </button>
          <button type="button" className="rf-oc-page-btn" onClick={load} disabled={loading}>
            {loading ? "…" : "Обновить"}
          </button>
        </div>
      </div>

      <div className="rf-oc-console rf-obs-console">
        <section className="rf-oc-left" aria-label="Логи обработки">
          <div className="rf-oc-filters">
            <div className="rf-oc-filter-row rf-obs-filter-row">
              <select
                className="rf-oc-select"
                value={windowLabel}
                onChange={(e) => setWindowLabel(e.target.value)}
                aria-label="Окно времени"
              >
                {windowOptions.map((w) => (
                  <option key={w.label} value={w.label}>{w.label}</option>
                ))}
              </select>
              <select
                className="rf-oc-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Статус"
              >
                <option value="">все статусы</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              className="rf-oc-search"
              placeholder="Номер или ID обращения…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              aria-label="Номер или ID обращения"
            />

            <div className="rf-oc-page-controls">
              <button
                type="button"
                className="rf-oc-page-btn"
                onClick={() => setPageIndex(Math.max(0, safePage - 1))}
                disabled={safePage <= 0 || !total}
              >
                ← Назад
              </button>
              <span className="rf-oc-page-info">
                Страница {total === 0 ? 0 : safePage + 1} из {totalPages}
              </span>
              <button
                type="button"
                className="rf-oc-page-btn"
                onClick={() => setPageIndex(safePage + 1)}
                disabled={safePage >= totalPages - 1 || !total}
              >
                Вперёд →
              </button>
            </div>

            <div className="rf-oc-filter-meta rf-oc-meta-row">
              <span>Всего {total}</span>
              <button
                type="button"
                className="rf-oc-page-btn rf-obs-reset-btn"
                onClick={resetFilters}
                disabled={!filtersDirty}
              >
                Сброс
              </button>
            </div>

            {error ? <div className="rf-oc-inline-error rf-obs-error">{error}</div> : null}
          </div>

          <div className="rf-oc-list">
            {loading && !traces.length ? (
              <p className="rf-oc-empty">Загрузка логов…</p>
            ) : traces.length ? (
              traces.map((t) => (
                <LogItem key={t.review_id} trace={t} active={String(selectedId) === String(t.review_id)} onSelect={() => setSelectedId(t.review_id)} />
              ))
            ) : (
              <p className="rf-oc-empty">{error || "За выбранный период обращений не найдено."}</p>
            )}
          </div>
        </section>

        <section className="rf-oc-detail rf-obs-detail" aria-label="Детализация трейса">
          {rows}
        </section>
      </div>
    </OpPage>
  );
}