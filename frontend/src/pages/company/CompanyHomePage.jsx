import { Navigate } from "react-router-dom";

import { useRole } from "../../context/RoleContext.jsx";
import { ROLES } from "../../lib/role.js";

export default function CompanyHomePage() {
  const { role } = useRole();

  if (role === ROLES.OPERATOR) return <Navigate to="/operator/reviews" replace />;
  if (role === ROLES.ADMINISTRATOR) return <Navigate to="/analytics" replace />;

  return (
    <Navigate
      to="/access-denied"
      replace
      state={{ attemptedPath: "/company", allowedRoles: [ROLES.OPERATOR, ROLES.ADMINISTRATOR] }}
    />
  );
}

