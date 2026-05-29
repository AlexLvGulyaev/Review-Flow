# Sprint 020K — Global UI Localization Rollout

**Дата:** 2026-05-29  
**Задача:** `cursor_tasks_local/2026-05-29_sprint_020k_global_ui_localization_rollout.md`

---

## FULL PROMPT (summary)

Project-wide rollout of `frontend/src/lib/displayLabels.js`: replace raw English enum rendering in admin/operator/customer UI; keep canonical values in API/filters/logic; no layout changes.

---

## Unified mappings layer

**Path:** `frontend/src/lib/displayLabels.js` (extended)

New / consolidated maps:

| Map | Purpose |
|-----|---------|
| `SCENARIO_LABELS`, `SENTIMENT_LABELS`, `PRIORITY_LABELS` | Classification |
| `MODERATION_LABELS`, `PUBLICATION_LABELS` | Workflow status |
| `AI_DRAFT_STATUS_LABELS`, `REJECTION_REASON_LABELS` | Operator telemetry / modal |
| `REVIEW_STATUS_LABELS` | Customer status headlines |
| `ENTITY_ACTIVE_LABELS`, `ACTIVE_FILTER_LABELS` | KB active state |
| `EVENT_TYPE_LABELS` | Observability logs |

Helpers: `labelScenario`, `labelSentiment`, `labelPriority`, `labelModeration`, `labelPublication`, `labelOperationalEventType`, `labelClassificationLine`, `formatKbRoutingLabel`, `labelDistributionRow`, `labelReviewStatus`, `labelEntityActive`, …

`operatorLabels.js` — re-exports for operator modules + timeline copy only.

`reviewStatus.js` — re-exports `STATUS_HEADLINE` / `labelReviewStatus` from displayLabels (backward compatible).

---

## Raw enum renderings found → fixed

| Location | Was | Fix |
|----------|-----|-----|
| `ops/kb/kbModel.js` | `listSemantic` raw `scenario/sentiment/priority`, `active/inactive` | `labelClassificationLine`, `labelEntityActive` |
| `ops/kb/KnowledgeBaseWorkspace.jsx` | `scenario: complaint` pills; `active/inactive` pills & filter | `formatKbRoutingLabel`, `labelEntityActive`, `labelActiveFilter` |
| `pages/AnalyticsPage.jsx` | `DistributionTable` showed `row.label` English | `labelDistributionRow(title, row.label)` |
| `pages/LogsPage.jsx` | `event_type` in list, pill, metadata, timeline | `labelOperationalEventType` |
| `components/client/StatusModalPanel.jsx` | `STATUS_HEADLINE[status] \|\| status` fallback to raw | `labelReviewStatus` |
| `lib/reviewStatus.js` | Duplicate `STATUS_HEADLINE` dict | Re-export from displayLabels |

**Already localized (020J):** operator console — `OperatorLeftPanel`, `OperatorQueueItem`, `OperatorModerationWorkspace`, `RejectionFeedbackModal`, `operatorUtils` telemetry.

**Intentionally unchanged:**

- Form **inputs** in KB editor (canonical codes editable as text).
- API filter `value=""` attributes (English).
- Search haystacks / JSON payloads / technical IDs.
- English **chrome** labels on admin pages (`search`, `Refresh`) — not enum categories.

---

## Sections updated

| Area | Components |
|------|------------|
| **Admin — KB** | `KnowledgeBaseWorkspace.jsx`, `kbModel.js` |
| **Admin — Analytics** | `AnalyticsPage.jsx` |
| **Admin — Logs** | `LogsPage.jsx` |
| **Admin — Evaluation / Prompts** | No enum display surfaces (scores, prompt keys) |
| **Operator** | Already on displayLabels (020J) |
| **Customer** | `StatusModalPanel.jsx`, `reviewStatus.js` |

---

## Components migrated (this sprint)

- `frontend/src/lib/displayLabels.js`
- `frontend/src/lib/reviewStatus.js`
- `frontend/src/ops/kb/kbModel.js`
- `frontend/src/ops/kb/KnowledgeBaseWorkspace.jsx`
- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/pages/LogsPage.jsx`
- `frontend/src/components/client/StatusModalPanel.jsx`
- `frontend/src/ops/operator/operatorLabels.js` (re-export expansion)

Layout / proportions / workflow: **not changed**.

---

## BEFORE/AFTER screenshots

Не снимались (headless environment).

## Build result

```text
vite v6.4.2 — ✓ built in ~2.6s (107 modules)
```
