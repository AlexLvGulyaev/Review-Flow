import { Navigate, useLocation } from "react-router-dom";
import { useRole } from "../context/RoleContext.jsx";

export default function ProtectedRoute({ allowed, children }) {
  const { role } = useRole();
  const location = useLocation();

  if (!allowed.includes(role)) {
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
