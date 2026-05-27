import { useRole } from "../context/RoleContext.jsx";
import { ROLE_LABELS } from "../lib/role.js";

export default function RoleSelector() {
  const { role, setRole, ROLES } = useRole();

  return (
    <label className="role-selector">
      Роль:{" "}
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        {Object.values(ROLES).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r] || r}
          </option>
        ))}
      </select>
    </label>
  );
}
