/** Company contour paths (Sprint 024D). */

export function isCompanyEntryPath(pathname) {
  return pathname === "/company";
}

/** Staff-only paths: client must pick a mode on /company first. */
export function isCompanyStaffPath(pathname) {
  if (isCompanyEntryPath(pathname)) return false;
  return (
    pathname.startsWith("/operator/") ||
    pathname.startsWith("/admin/") ||
    pathname === "/analytics" ||
    pathname.startsWith("/analytics/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname === "/logs" ||
    pathname.startsWith("/logs/") ||
    pathname.startsWith("/settings/") ||
    pathname === "/prompts" ||
    pathname.startsWith("/prompts/") ||
    pathname === "/evaluation" ||
    pathname.startsWith("/evaluation/")
  );
}
