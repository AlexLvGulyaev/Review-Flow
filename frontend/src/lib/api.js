import { getStoredRole } from "./role.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8700";

export function getApiUrl() {
  return API_URL;
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
    return detail || "Доступ запрещён для текущей роли";
  }
  return detail || fallback || `Ошибка ${res.status}`;
}

export async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "X-Role": getStoredRole(),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  return res;
}
