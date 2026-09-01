import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AUDIT_ROLE } from "../../lib/chipContract.js";
import {
  labelAuditAction,
  labelAuditResourceType,
  labelAuditRole,
} from "../../lib/displayLabels.js";
import { adminApiDownload, adminApiFetch, readApiError } from "../../lib/api.js";
import { OpPage } from "../components/OpPage.jsx";
import { OpChipFor } from "../components/OpChip.jsx";
import {
  formatJson,
  formatTs,
  isoDateFrom,
  PAGE_SIZE,
  paginate,
  WINDOW_OPTIONS,
} from "./observabilityShared.js";

import "./observability.css";

/**
 * «Журнал аудита» — канон AIC AuditLog.jsx: слева карточка 420px (фильтры,
 * пагинация, список, «Всего N» + Сброс), в шапке страницы — Экспорт CSV и
 * Обновить, справа — детализация события («ДЕТАЛИЗАЦИЯ СОБЫТИЯ» + чип акции,
 * «Параметры акции» / «Параметры пользователя», «Детали / metadata»,
 * технический снимок JSON).
 */

const API = "/api/audit";

const RESOURCE_TYPE_OPTIONS = [
  { value: "review", label: "Обращения" },
  { value: "response_case", label: "Типовые ситуации" },
  { value: "case_candidate", label: "Кандидаты ситуаций" },
  { value: "phrase", label: "Фразы" },
  { value: "template", label: "Шаблоны" },
  { value: "scenario", label: "Сценарии" },
  { value: "sentiment", label: "Тональности" },
  { value: "prompt_version", label: "Версии промптов" },
  { value: "ai_provider", label: "AI-провайдеры" },
  { value: "ch_runtime_settings", label: "Настройки CH" },
  { value: "evaluation_case", label: "Evaluation case" },
  { value: "demo_session", label: "Демо-сессии" },
];

const ROLE_OPTIONS = [
  { value: "client", label: "Клиент" },
  { value: "operator", label: "Оператор" },
  { value: "administrator", label: "Администратор" },
  { value: "demo", label: "Демо" },
];

/* AIC SectionBox / CompactRow: узкая колонка label + значение (или «—»). */
function SectionBox({ title, children }) {
  return (
    <div className="rf-obs-sectionbox">
      <h4 className="rf-obs-sectionbox__title">{title}</h4>
      <dl className="rf-oc-kv-list">{children}</dl>
    </div>
  );
}

function CompactRow({ label, value, mono = false }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? "rf-obs-monospace" : undefined}>{value || "—"}</dd>
    </>
  );
}

function AuditItem({ entry, active, onSelect }) {
  return (
    <button
      type="button"
      className={active ? "rf-oc-item rf-oc-item--selected" : "rf-oc-item"}
      onClick={onSelect}
      data-audit-id={entry.id}
    >
      <div className="rf-oc-item__row rf-oc-item__row--head">
        <span className="rf-oc-item__ts">{formatTs(entry.timestamp)}</span>
        {/* Роль — только значком; подсказка «Роль: …» — из контракта. */}
        <OpChipFor map={AUDIT_ROLE} code={entry.user_role} emojiOnly />
      </div>
      {/* «одна строка — один размер шрифта»: суть действия в отдельной строке */}
      <div className="rf-oc-item__preview">{labelAuditAction(entry.action)}</div>
      <div className="rf-oc-item__row rf-oc-item__telemetry">
        <span>{labelAuditResourceType(entry.resource_type)}</span>
        {entry.ip_address ? <span>{entry.ip_address}</span> : null}
        <span className="rf-oc-item__meta">#{entry.seq_number}</span>
      </div>
    </button>
  );
}

export default function AuditWorkspace() {
  const [windowLabel, setWindowLabel] = useState("7d");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // AIC nav: выбор элемента после перехода страницы стрелками.
  const pendingPageSelectIndexRef = useRef(null);
  const pendingListFocusRef = useRef(null);

  const windowOptions = WINDOW_OPTIONS;

  // Фильтры применяются сразу (AIC-канон); смена фильтра сбрасывает страницу.
  // dateFrom зависит ТОЛЬКО от окна времени: пересчёт от total/pageIndex
  // давал бы новую ISO-метку на каждый цикл загрузки → бесконечный refetch.
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
    if (actionFilter.trim()) params.set("action", actionFilter.trim());
    if (resourceTypeFilter) params.set("resource_type", resourceTypeFilter);
    if (roleFilter) params.set("user_role", roleFilter);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(safePage * PAGE_SIZE));
    return params.toString();
  }, [dateFrom, actionFilter, resourceTypeFilter, roleFilter, safePage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch(`/api/audit?${listParams}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить журнал аудита"));
      const data = await res.json();
      const items = data.items || [];
      setEntries(items);
      setTotal(data.total || 0);
      if (pendingPageSelectIndexRef.current != null) {
        const idx = pendingPageSelectIndexRef.current;
        pendingPageSelectIndexRef.current = null;
        const target = items[idx] || items[0];
        if (target?.id) {
          pendingListFocusRef.current = true;
          setSelectedId(target.id);
        }
      }
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    load();
  }, [load]);

  function resetFilters() {
    setWindowLabel("7d");
    setActionFilter("");
    setResourceTypeFilter("");
    setRoleFilter("");
    setPageIndex(0);
  }

  const filtersDirty =
    windowLabel !== "7d" || Boolean(actionFilter) || Boolean(resourceTypeFilter) || Boolean(roleFilter);

  useEffect(() => {
    setPageIndex(0);
  }, [windowLabel, actionFilter, resourceTypeFilter, roleFilter]);

  useEffect(() => {
    if (!entries.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !entries.some((e) => String(e.id) === String(selectedId))) {
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const res = await adminApiFetch(`/api/audit/${selectedId}`);
        if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить событие"));
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
      const curIdx = selectedId ? entries.findIndex((x) => String(x.id) === String(selectedId)) : 0;
      if (curIdx < 0) return;
      if (e.key === "ArrowDown") {
        if (curIdx + 1 < entries.length) {
          e.preventDefault();
          setSelectedId(entries[curIdx + 1].id);
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
        setSelectedId(entries[curIdx - 1].id);
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
  }, [entries, selectedId, safePage, totalPages]);

  // AIC: выбранная строка всегда видна в списке.
  useEffect(() => {
    if (!selectedId) return;
    const list = document.querySelector(".rf-oc-list");
    if (!list) return;
    const row = list.querySelector(`[data-audit-id="${String(selectedId).replace(/"/g, '\\"')}"]`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }, [selectedId, entries]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams(listParams);
      params.delete("limit");
      params.delete("offset");
      await adminApiDownload(
        `/api/audit/export?${params.toString()}`,
        `rf_audit_${new Date().toISOString().slice(0, 10)}.csv`,
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
        <h3 className="rf-obs-detail-title">ДЕТАЛИЗАЦИЯ СОБЫТИЯ</h3>
        <span className="ai-status ai-status--signal--primary" title={labelAuditAction(detail.action)}>
          {detail.action}
        </span>
      </div>

      <div className="rf-obs-detail-grid">
        <SectionBox title="Параметры акции">
          <CompactRow label="ID акции" value={detail.seq_number} mono />
          <CompactRow label="Тип акции" value={detail.action} />
          <CompactRow label="ID ресурса" value={detail.resource_id} mono />
          <CompactRow label="Тип ресурса" value={labelAuditResourceType(detail.resource_type)} />
        </SectionBox>

        <SectionBox title="Параметры пользователя">
          <CompactRow label="ID пользователя" value={detail.user_id} mono />
          <CompactRow label="Имя пользователя" value={detail.user_name || labelAuditRole(detail.user_role)} />
          <CompactRow label="IP-адрес" value={detail.ip_address} mono />
          <CompactRow label="Дата события" value={formatTs(detail.timestamp)} />
        </SectionBox>
      </div>

      <div className="rf-obs-sectionbox">
        <h4 className="rf-obs-sectionbox__title">Детали / metadata</h4>
        <pre className="rf-obs-pre">{formatJson(detail.details)}</pre>
      </div>

      {/* AIC SessionJsonSnapshot: details-снимок вместо карточки с кнопкой. */}
      <details className="rf-obs-snapshot">
        <summary className="rf-obs-snapshot__summary">Технический снимок события (JSON)</summary>
        <pre className="rf-obs-snapshot__pre">{formatJson(detail)}</pre>
      </details>
    </>
  ) : (
    <p className="rf-oc-empty">{detailLoading ? "Загрузка деталей…" : "Выберите audit-запись для просмотра."}</p>
  );

  return (
    <OpPage wide className="op-page--operator-full op-page--obs-full">
      <div className="rf-oc-workspace-header">
        <div>
          <h2 className="rf-oc-workspace-header__title">Журнал аудита</h2>
          <p className="rf-oc-workspace-header__subtitle">
            Пользовательская активность: действия персонала, запросы клиентов, проверки статуса, демо-сессии.
          </p>
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
        <section className="rf-oc-left" aria-label="Журнал аудита">
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
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Роль"
              >
                <option value="">все роли</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                className="rf-oc-select"
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                aria-label="Тип ресурса"
              >
                <option value="">все ресурсы</option>
                {RESOURCE_TYPE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                type="text"
                className="rf-oc-search rf-obs-search-inline"
                placeholder="Действие (action)…"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                aria-label="Действие"
              />
            </div>

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

            <div className="rf-oc-filter-meta">
              <span>Всего {total}</span>
              <button
                type="button"
                className="rf-oc-page-btn"
                onClick={resetFilters}
                disabled={!filtersDirty}
              >
                Сброс
              </button>
            </div>

            {error ? <div className="rf-oc-inline-error rf-obs-error">{error}</div> : null}
          </div>

          <div className="rf-oc-list">
            {loading && !entries.length ? (
              <p className="rf-oc-empty">Загрузка журнала аудита…</p>
            ) : entries.length ? (
              entries.map((e) => (
                <AuditItem key={e.id} entry={e} active={String(selectedId) === String(e.id)} onSelect={() => setSelectedId(e.id)} />
              ))
            ) : (
              <p className="rf-oc-empty">{error || "За выбранный период записей не найдены."}</p>
            )}
          </div>
        </section>

        <section className="rf-oc-detail rf-obs-detail" aria-label="Детализация события">
          {rows}
        </section>
      </div>
    </OpPage>
  );
}