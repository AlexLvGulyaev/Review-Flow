export const ROLES = {
  CLIENT: "client",
  OPERATOR: "operator",
  ADMINISTRATOR: "administrator",
};

export const ROLE_LABELS = {
  [ROLES.CLIENT]: "Клиент",
  [ROLES.OPERATOR]: "Оператор",
  [ROLES.ADMINISTRATOR]: "Администратор",
};

export function formatRolesList(roles) {
  if (!roles?.length) return "—";
  return roles.map((r) => ROLE_LABELS[r] || r).join(", ");
}

const STORAGE_KEY = "review-flow-role";

export function getStoredRole() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && Object.values(ROLES).includes(v)) return v;
  } catch {
    /* private mode / blocked storage */
  }
  return ROLES.CLIENT;
}

export function setStoredRole(role) {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}
