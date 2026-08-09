import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  authenticateDemoUser,
  clearCompanySession,
  loadCompanySession,
  saveCompanySession,
} from "../lib/companyAuth.js";
import { ROLES } from "../lib/role.js";
import { useRole } from "./RoleContext.jsx";

const CompanyAuthContext = createContext(null);

export function CompanyAuthProvider({ children }) {
  const { setRole } = useRole();
  const [session, setSession] = useState(() => loadCompanySession());

  useEffect(() => {
    if (session) {
      setRole(session.role);
    }
  }, [session, setRole]);

  const login = useCallback(
    async (email, password) => {
      const user = authenticateDemoUser(email, password);
      const next = { email: user.email, role: user.role, label: user.label };
      saveCompanySession(next);
      setSession(next);
      setRole(user.role);
      return next;
    },
    [setRole]
  );

  const logout = useCallback(() => {
    clearCompanySession();
    setSession(null);
    setRole(ROLES.CLIENT);
  }, [setRole]);

  const value = useMemo(
    () => ({
      session,
      isStaffSignedIn: Boolean(session),
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <CompanyAuthContext.Provider value={value}>{children}</CompanyAuthContext.Provider>;
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  return ctx;
}
