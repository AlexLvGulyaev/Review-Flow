import { getStoredRole, setStoredRole, ROLES } from "./role.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8700";

export function getApiUrl() {
  return API_URL;
}

/** Clear a stale/invalid ops session and force re-login. */
function clearOpsSession() {
  try {
    localStorage.removeItem("review-flow-company-session");
  } catch {
    /* ignore */
  }
  setStoredRole(ROLES.CLIENT);
}

/** Read the ops Bearer token from the persisted session, if any. */
function getOpsToken() {
  try {
    const raw = localStorage.getItem("review-flow-company-session");
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.token || null;
  } catch {
    return null;
  }
}

function isOpsDemoSession() {
  try {
    const raw = localStorage.getItem("review-flow-company-session");
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data?.isDemo) || data?.role === "demo";
  } catch {
    return false;
  }
}

export async function readApiError(res, fallback) {
  const body = await res.json().catch(() => ({}));
  let detail = body.detail;
  if (Array.isArray(detail)) {
    detail = detail.map((e) => e.msg || JSON.stringify(e)).join("; ");
  } else if (detail && typeof detail === "object") {
    detail = JSON.stringify(detail);
  }
  if (res.status === 403) {
    if (isOpsDemoSession()) {
      return "Демо-режим: только просмотр. Изменения запрещены.";
    }
    return detail || "Доступ запрещён для текущей роли";
  }
  if (res.status === 401) {
    return detail || "Требуется авторизация ops-токеном.";
  }
  return detail || fallback || `Ошибка ${res.status}`;
}

/**
 * @param {string} path
 * @param {RequestInit & { role?: string }} options
 *   role — explicit X-Role (dev fallback only; in prod the Bearer token is
 *   authoritative and the header is ignored by the backend).
 *
 * Sends the ops Bearer token when an ops session exists (prod auth), the
 * public demo token when a demo session exists (gates POST /api/reviews), and
 * the legacy X-Role header as a dev fallback when no ops token is present.
 */
export async function apiFetch(path, options = {}) {
  const { role, ...fetchOptions } = options;
  const headers = {
    ...(fetchOptions.headers || {}),
  };
  const opsToken = getOpsToken();
  if (opsToken) {
    headers["Authorization"] = `Bearer ${opsToken}`;
  } else {
    headers["X-Role"] = role ?? fetchOptions.headers?.["X-Role"] ?? getStoredRole();
  }
  const demoToken =
    typeof localStorage !== "undefined" ? localStorage.getItem("review-flow-demo-token") : null;
  if (demoToken) headers["X-Demo-Token"] = demoToken;
  if (fetchOptions.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  // Ops session invalid/expired: we sent a Bearer but the backend rejected it
  // on an ops endpoint. Clear the stale session and send the user back to the
  // staff login. Demo-limiter 401s come from /api/demo/* and are handled by
  // DemoContext (clearDemo), so we leave those alone.
  if (res.status === 401 && opsToken && !path.startsWith("/api/demo")) {
    clearOpsSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/company") {
      window.location.replace("/company");
    }
  }
  return res;
}

/** Admin API calls — same auth as apiFetch; kept as a semantic marker. */
export function adminApiFetch(path, options = {}) {
  return apiFetch(path, options);
}

/** Download file from admin API with auth headers. */
export async function adminApiDownload(path, fallbackName = "export.bin") {
  const res = await adminApiFetch(path);
  if (!res.ok) {
    throw new Error(await readApiError(res, "Не удалось выгрузить файл"));
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename=\"?([^\";]+)/i);
  const filename = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}