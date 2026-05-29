import {
  isOperatorWorkflowCompleted,
  labelAiDraftStatus,
  labelModeration,
  labelPublication,
  labelPriority,
  labelScenario,
  labelSentiment,
  labelTemplateDescriptor,
} from "../../lib/displayLabels.js";

export function formatAge(createdAt) {
  if (!createdAt) return "—";
  const ms = Date.now() - new Date(createdAt).getTime();
  if (ms < 0) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} д`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Человекочитаемый идентификатор обращения (NL-… из API). */
export function getOperationalIdentity(item) {
  const requestNumber = item.request_number?.trim();
  if (requestNumber) {
    return {
      primary: `Обращение ${requestNumber}`,
      secondary: item.customer_name?.trim() || null,
      kind: "request",
    };
  }

  const caseTitle = item.service_case_title?.trim();
  const customer = item.customer_name?.trim() || "Клиент";

  if (caseTitle) {
    return {
      primary: caseTitle.startsWith("NL-") || caseTitle.startsWith("RF-") ? caseTitle : `Заказ · ${caseTitle}`,
      secondary: customer,
      kind: "case",
    };
  }

  return {
    primary: `Обращение · ${customer}`,
    secondary: item.product_area?.trim() || null,
    kind: "review",
  };
}

export function formatRequestHeader(item) {
  const num = item?.request_number?.trim();
  if (num) return `ОБРАЩЕНИЕ ${num}`;
  return getOperationalIdentity(item).primary.toUpperCase();
}

export function templateDisplayLabel(template) {
  return labelTemplateDescriptor(template);
}

export { isOperatorWorkflowCompleted };

/** Queue line 3 — pipeline telemetry (no business metadata). */
export function buildQueueTelemetry(item) {
  const parts = [];
  if (item.created_at) parts.push(formatAge(item.created_at));
  parts.push(labelAiDraftStatus(item.moderation_status));
  if (item.scenario) parts.push(labelScenario(item.scenario));
  if (item.moderation_status === "approved") parts.push(labelModeration("approved"));
  if (item.publication_status === "published") parts.push(labelPublication("published"));
  return parts.join(" · ") || "—";
}

export function buildDetailTelemetry(detail) {
  const logs = detail?.operational_logs || [];
  const parts = [];
  if (detail?.created_at) parts.push(formatAge(detail.created_at));
  if (logs.some((l) => l.event_type === "draft_generated")) parts.push("черновик AI");
  if (logs.some((l) => l.event_type === "classification_completed")) parts.push("классификация");
  if (detail?.matched_phrase_text) parts.push("фраза найдена");
  if (detail?.ai_review_mode === "manual_override") parts.push("ручная правка");
  return parts.join(" · ") || buildQueueTelemetry(detail);
}

export function isEditorLocked(detail) {
  return detail?.ai_review_mode !== "manual_override";
}

export function shortTechnicalId(uuid) {
  if (!uuid) return "";
  const s = String(uuid);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
}

export function truncateText(text, max = 120) {
  const s = String(text || "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function aiDraftHint(moderationStatus) {
  if (!moderationStatus) return { label: labelAiDraftStatus(null), color: "gray" };
  if (moderationStatus === "pending_review") return { label: labelAiDraftStatus("pending_review"), color: "blue" };
  if (moderationStatus === "needs_revision") return { label: labelAiDraftStatus("needs_revision"), color: "orange" };
  if (moderationStatus === "rejected") return { label: labelAiDraftStatus("rejected"), color: "red" };
  if (moderationStatus === "approved") return { label: labelAiDraftStatus("approved"), color: "green" };
  return { label: labelAiDraftStatus("pending_review"), color: "blue" };
}

export function queueCounters(items) {
  const total = items.length;
  const pending = items.filter((i) => i.moderation_status === "pending_review").length;
  const approved = items.filter((i) => i.moderation_status === "approved").length;
  const rejected = items.filter((i) => i.moderation_status === "rejected").length;
  const revision = items.filter((i) => i.moderation_status === "needs_revision").length;
  const published = items.filter((i) => i.publication_status === "published").length;
  return { total, pending, approved, rejected, revision, published };
}

export function formatLogDetails(logs) {
  if (!logs?.length) return null;
  try {
    return JSON.stringify(logs, null, 2);
  } catch {
    return String(logs);
  }
}

export function buildPipelineSummary(timeline) {
  if (!timeline?.length) return "—";
  const active = timeline.filter((s) => s.status === "done" || s.status === "current");
  if (!active.length) return timeline[0]?.title || "—";
  return active.map((s) => s.title).join(" → ");
}

export function moderationSummaryLine(detail) {
  const parts = [
    labelModeration(detail?.moderation_status),
    labelPublication(detail?.publication_status),
  ];
  return parts.join(" · ");
}
