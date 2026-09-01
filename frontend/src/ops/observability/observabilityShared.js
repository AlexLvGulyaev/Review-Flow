/** Общая логика экранов «Журнал аудита» и «Логи» (AIC-идеология:
    420px-список слева с окном времени/фильтрами/пагинацией, детализация справа). */

import { adminApiDownload } from "../../lib/api.js";

export const PAGE_SIZE = 7;

export const WINDOW_OPTIONS = [
  { label: "24h", value: 24 },
  { label: "7d", value: 24 * 7 },
  { label: "30d", value: 24 * 30 },
  { label: "все", value: null },
];

/** date_from для окна времени (полный ISO/UTC — точнее date-only AIC). */
export function isoDateFrom(hours) {
  if (hours == null) return "";
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export function paginate(total, pageIndex, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    totalPages,
    safePage: Math.min(pageIndex, totalPages - 1),
  };
}

export function formatTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("ru-RU", { hour12: false });
}

export function shortId(id) {
  return id ? String(id).slice(0, 8) : "—";
}

/** JSON-блок «Детали / metadata» (AIC formatDetailsJson). */
export function formatJson(value) {
  if (value == null || (typeof value === "object" && Object.keys(value).length === 0)) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Экспорт CSV через общий adminApiDownload (auth + Content-Disposition). */
export function downloadCsv(path, fallbackName) {
  return adminApiDownload(path, fallbackName);
}