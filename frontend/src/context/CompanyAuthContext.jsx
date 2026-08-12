import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  getStoredOpsSession,
  signInDemo,
  signInWithToken,
  signOut,
} from "../lib/companyAuth.js";
import { ROLES } from "../lib/role.js";
import { useRole } from "./RoleContext.jsx";

const CompanyAuthContext = createContext(null);

export function CompanyAuthProvider({ children }) {
  const { setRole } = useRole();
  const [session, setSession] = useState(() => getStoredOpsSession());

  useEffect(() => {
    if (session) {
      setRole(session.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const login = useCallback(
    async (token) => {
      const next = await signInWithToken(token);
      setSession(next);
      setRole(next.role);
      return next;
    },
    [setRole]
  );

  const loginDemo = useCallback(async () => {
    const next = await signInDemo();
    setSession(next);
    setRole(next.role);
    return next;
  }, [setRole]);

  const logout = useCallback(() => {
    signOut();
    setSession(null);
    setRole(ROLES.CLIENT);
  }, [setRole]);

  const isDemo = Boolean(session?.isDemo || session?.role === ROLES.DEMO);

  const value = useMemo(
    () => ({
      session,
      isStaffSignedIn: Boolean(session),
      isDemo,
      login,
      loginDemo,
      logout,
    }),
    [session, isDemo, login, loginDemo, logout]
  );

  return <CompanyAuthContext.Provider value={value}>{children}</CompanyAuthContext.Provider>;
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  return ctx;
}