import { createContext, useContext, useState } from "react";
import { getStoredRole, ROLES, setStoredRole } from "../lib/role.js";

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(getStoredRole);

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
