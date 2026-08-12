import { createContext, useContext, useState } from "react";
import { getStoredRole, ROLES, setStoredRole } from "../lib/role.js";
import { getStoredOpsSession, isStaffRole } from "../lib/companyAuth.js";

const RoleContext = createContext(null);

/**
 * The ops token session (review-flow-company-session) is the authoritative
 * source of staff identity. A persisted staff role in review-flow-role without
 * a matching token session is stale state left over from the legacy
 * email-password/X-Role flow — clear it so the user is sent to login instead of
 * reaching staff pages with no Bearer token (which the backend rejects with
 * 401 "Ops token required").
 */
function reconcileInitialRole() {
  const session = getStoredOpsSession();
  if (session) return session.role;
  const stored = getStoredRole();
  if (isStaffRole(stored)) {
    setStoredRole(ROLES.CLIENT);
    return ROLES.CLIENT;
  }
  return stored;
}

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(reconcileInitialRole);

  const setRole = (next) => {
    setRoleState(next);
    setStoredRole(next);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
