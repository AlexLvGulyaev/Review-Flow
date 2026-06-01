import { ROLES } from "./role.js";

const SESSION_KEY = "review-flow-company-session";

/** Demo corporate accounts (Assistant Flow–style, no backend auth). */
export const DEMO_COMPANY_USERS = [
  {
    email: "operator@northline.local",
    password: "demo",
    role: ROLES.OPERATOR,
    label: "Оператор",
  },
  {
    email: "admin@northline.local",
    password: "demo",
    role: ROLES.ADMINISTRATOR,
    label: "Администратор",
  },
];

export function getStaffHomePath(role) {
  if (role === ROLES.OPERATOR) return "/operator/reviews";
  if (role === ROLES.ADMINISTRATOR) return "/reports";
  return "/company";
}

export function loadCompanySession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.email || !data?.role) return null;
    if (![ROLES.OPERATOR, ROLES.ADMINISTRATOR].includes(data.role)) return null;
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

export function authenticateDemoUser(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  const row = DEMO_COMPANY_USERS.find((u) => u.email === normalized);
  if (!row || row.password !== password) {
    throw new Error("Неверный email или пароль");
  }
  return {
    email: row.email,
    role: row.role,
    label: row.label,
  };
}

export function isStaffRole(role) {
  return role === ROLES.OPERATOR || role === ROLES.ADMINISTRATOR;
}
