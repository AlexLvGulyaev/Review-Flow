import { TIMELINE_STAGE_TITLES, TRACE_STATUS_LABELS, labelModeration, labelPublication } from "./operatorLabels.js";
import { formatLogDetails } from "./operatorUtils.js";

const STAGE_LOG_TYPES = {
  received: ["review_received"],
  classified: ["classification_completed"],
  template: ["template_selected"],
  draft: ["draft_generated"],
  handoff: ["operator_review_opened"],
  moderation: ["moderation_rejected", "moderation_revision_requested"],
  published: ["mock_publication_completed"],
};

export function buildLifecycleTimeline(detail, formatDateTime) {
  const logs = detail?.operational_logs || [];
  const has = (eventType) => logs.some((l) => l.event_type === eventType);
  const ts = (eventType) => {
    const last = [...logs].reverse().find((l) => l.event_type === eventType);
    return last?.created_at ? formatDateTime(last.created_at) : null;
  };

  const moderation = detail?.moderation_status;
  const publication = detail?.publication_status;

  const stages = [
    { key: "received", done: has("review_received") },
    { key: "classified", done: has("classification_completed") },
    { key: "template", done: has("template_selected") },
    { key: "draft", done: has("draft_generated") },
    { key: "handoff", done: has("operator_review_opened") || moderation === "pending_review" },
    { key: "edited", done: Boolean(detail?.final_response) },
    {
      key: "moderation",
      done: ["approved", "rejected", "needs_revision"].includes(moderation),
      failed: moderation === "rejected",
    },
    {
      key: "published",
      done: publication === "published" || has("mock_publication_completed"),
      failed: publication === "failed",
    },
  ];

  const firstPending = stages.find((s) => !s.done && !s.failed);
  const currentKey = firstPending?.key || "published";

  const eventTypeForKey = {
    received: "review_received",
    classified: "classification_completed",
    template: "template_selected",
    draft: "draft_generated",
    handoff: "operator_review_opened",
    published: "mock_publication_completed",
  };

  return stages.map((s) => {
    let status = "todo";
    if (s.failed) status = "failed";
    else if (s.done) status = "done";
    else if (s.key === currentKey) status = "current";

    const stageLogs = (STAGE_LOG_TYPES[s.key] || [])
      .flatMap((eventType) => logs.filter((l) => l.event_type === eventType))
      .slice(0, 4);
    const details = formatLogDetails(stageLogs);
    const detailsPreview = details
      ? `${stageLogs.length} событ.`
      : s.key === "moderation"
        ? labelModeration(moderation)
        : s.key === "published"
          ? labelPublication(publication)
          : null;

    return {
      key: s.key,
      stageKey: s.key,
      title: TIMELINE_STAGE_TITLES[s.key] || s.key,
      meta: ts(eventTypeForKey[s.key] || ""),
      subtitle:
        s.key === "moderation"
          ? labelModeration(moderation)
          : s.key === "published"
            ? labelPublication(publication)
            : null,
      status,
      statusLabel: TRACE_STATUS_LABELS[status] || status,
      details: details || undefined,
      detailsPreview: details ? detailsPreview : detailsPreview || undefined,
    };
  });
}
