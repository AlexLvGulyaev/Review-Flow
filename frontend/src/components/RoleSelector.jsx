import { useRole } from "../context/RoleContext.jsx";
import { ROLE_LABELS, ROLES } from "../lib/role.js";

const STAFF_ROLES = [ROLES.OPERATOR, ROLES.ADMINISTRATOR];

export default function RoleSelector({ staffOnly = false }) {
  const { role, setRole } = useRole();
  const options = staffOnly ? STAFF_ROLES : Object.values(ROLES);
  const value = options.includes(role) ? role : STAFF_ROLES[0];

  return (
    <label className="role-selector">
      Режим:{" "}
      <select value={value} onChange={(e) => setRole(e.target.value)}>
        {options.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r] || r}
          </option>
        ))}
      </select>
    </label>
  );
}
