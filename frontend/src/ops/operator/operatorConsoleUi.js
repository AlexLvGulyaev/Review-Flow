/**
 * Patterns ported from Assistant Flow `operationalConsoleUi.ts` (composition only, NL theme).
 */

export function detailsJsonPreview(d) {
  if (d == null) return "пусто";
  if (typeof d === "string") return d.length > 56 ? `${d.slice(0, 56)}…` : d;
  try {
    const s = JSON.stringify(d);
    return s.length > 56 ? `${s.slice(0, 56)}…` : s || "{}";
  } catch {
    return "?";
  }
}

export function formatDetailsJson(d) {
  if (d == null) return "null";
  if (typeof d === "string") return d;
  try {
    return JSON.stringify(d, null, 2);
  } catch {
    return String(d);
  }
}

/** Heuristic from AF `pipelineStageVariant`. */
export function pipelineStageVariant(stage, status) {
  const s = (stage || "").toLowerCase();
  const st = (status || "").trim().toLowerCase();
  if (
    st === "error" ||
    st === "failed" ||
    s.includes("error") ||
    s.endsWith("_error") ||
    s.includes("failure") ||
    s === "failed"
  ) {
    return "error";
  }
  if (st === "warning" || s.includes("warn")) return "warning";
  if (s.includes("reject") || s === "rejected") return "error";
  if (s.includes("revision") || s === "needs_revision") return "warning";
  if (s === "published" || s.includes("publish")) return "success";
  if (s === "current" || s.includes("handoff") || s.includes("operator")) return "processing";
  if (s === "done" || st === "ok" || st === "success") return "success";
  if (s === "todo" || s.includes("pending")) return "loading";
  return "muted";
}
