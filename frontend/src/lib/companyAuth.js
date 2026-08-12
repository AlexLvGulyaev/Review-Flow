import { ROLES, ROLE_LABELS } from "./role.js";
import { getApiUrl } from "./api.js";

const SESSION_KEY = "review-flow-company-session";

/** Build-time demo token for the read-only ops demo (VITE_OPS_DEMO_TOKEN). */
const OPS_DEMO_TOKEN = import.meta.env.VITE_OPS_DEMO_TOKEN || "";

/**
 * Ops/admin console authentication via real Bearer tokens (read-only demo RBAC).
 *
 * A token is validated against GET /api/auth/whoami, which returns the
 * authoritative role (administrator / operator / demo). The session
 * {token, role, label} is persisted in localStorage. The demo token (if
 * configured at build time) grants a read-only role — mutations are blocked on
 * the backend and surfaced clearly in the UI.
 */

export function getStaffHomePath(role) {
  if (role === ROLES.OPERATOR) return "/operator/reviews";
  if (role === ROLES.ADMINISTRATOR) return "/reports";
  if (role === ROLES.DEMO) return "/reports"; // read-only overview
  return "/company";
}

export function isStaffRole(role) {
  return (
    role === ROLES.OPERATOR ||
    role === ROLES.ADMINISTRATOR ||
    role === ROLES.DEMO
  );
}

export function isOpsDemoToken(token) {
  return Boolean(OPS_DEMO_TOKEN) && token === OPS_DEMO_TOKEN;
}

export function getStoredOpsSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.token || !data?.role || !isStaffRole(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCompanySession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearCompanySession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Validate a Bearer token against /api/auth/whoami and persist the session.
 * Throws on an invalid/unauthorized token or a non-staff role.
 */
export async function signInWithToken(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) throw new Error("Введите токен");

  const res = await fetch(`${getApiUrl()}/api/auth/whoami`, {
    headers: { Authorization: `Bearer ${trimmed}` },
  });

  if (res.status === 401) {
    throw new Error("Токен не принят. Проверьте, что токен указан верно.");
  }
  if (res.status === 403) {
    throw new Error("Недействительный токен.");
  }
  if (!res.ok) {
    throw new Error(`Ошибка авторизации (${res.status}).`);
  }

  const data = await res.json().catch(() => ({}));
  const role = data.role;
  if (!role || !isStaffRole(role)) {
    throw new Error("Токен не предоставляет доступ к рабочему пространству.");
  }

  const session = {
    token: trimmed,
    role,
    label: ROLE_LABELS[role] || role,
    isDemo: role === ROLES.DEMO || isOpsDemoToken(trimmed),
  };
  saveCompanySession(session);
  return session;
}

/** Sign in with the build-time read-only demo token, if configured. */
export async function signInDemo() {
  if (!OPS_DEMO_TOKEN) {
    throw new Error("Демо-вход не настроен на этом экземпляре.");
  }
  return signInWithToken(OPS_DEMO_TOKEN);
}

export function signOut() {
  clearCompanySession();
}