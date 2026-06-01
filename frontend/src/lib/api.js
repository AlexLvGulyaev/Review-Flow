import { getStoredRole, ROLES } from "./role.js";

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

/**
 * @param {string} path
 * @param {RequestInit & { role?: string }} options
 *   role — explicit X-Role (admin-only screens should pass ROLES.ADMINISTRATOR)
 */
export async function apiFetch(path, options = {}) {
  const { role, ...fetchOptions } = options;
  const headers = {
    ...(fetchOptions.headers || {}),
    "X-Role": role ?? fetchOptions.headers?.["X-Role"] ?? getStoredRole(),
  };
  if (fetchOptions.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  return res;
}

/** Admin API calls — always send administrator role (ProtectedRoute-gated pages). */
export function adminApiFetch(path, options = {}) {
  return apiFetch(path, { ...options, role: ROLES.ADMINISTRATOR });
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
