import { Navigate, useLocation } from "react-router-dom";
import { useRole } from "../context/RoleContext.jsx";
import { ROLES } from "../lib/role.js";

export default function ProtectedRoute({ allowed, children }) {
  const { role } = useRole();
  const location = useLocation();

  if (!allowed.includes(role)) {
    // Not signed in at all → send to the staff login rather than access-denied,
    // so a stale/expired session routes the user back to sign in.
    if (role === ROLES.CLIENT) {
      return <Navigate to="/company" replace state={{ staffSignInRequired: true }} />;
    }
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          attemptedPath: location.pathname,
          allowedRoles: allowed,
        }}
      />
    );
  }

  return children;
}
