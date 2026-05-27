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
  const v = localStorage.getItem(STORAGE_KEY);
  if (v && Object.values(ROLES).includes(v)) return v;
  return ROLES.CLIENT;
}

export function setStoredRole(role) {
  localStorage.setItem(STORAGE_KEY, role);
}
