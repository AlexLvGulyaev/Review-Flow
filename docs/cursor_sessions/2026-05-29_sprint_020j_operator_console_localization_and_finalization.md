# Sprint 020J — Operator Console Localization + Workflow Finalization

**Дата:** 2026-05-29  
**Задача:** `cursor_tasks_local/2026-05-29_sprint_020j_operator_console_localization_and_finalization.md`

---

## FULL PROMPT (summary)

1. Unified display-label mapping layer (canonical EN in API/DB, RU in UI).
2. After successful approve + publish: disable «Одобрить и отправить» and «Отклонить» with tooltip; do not hide buttons or change layout.
3. `npm run build` + session log.

---

## Unified mappings layer

**Path:** `frontend/src/lib/displayLabels.js`

Reusable across admin / operator / customer consoles.

| Export | Purpose |
|--------|---------|
| `SCENARIO_LABELS` | question, complaint, gratitude, suggestion, … |
| `SENTIMENT_LABELS` | positive, neutral, negative, aggressive |
| `PRIORITY_LABELS` | low … critical |
| `MODERATION_LABELS` | pending_review … needs_revision |
| `PUBLICATION_LABELS` | published, not_published, … |
| `AI_DRAFT_STATUS_LABELS` | Telemetry AI state copy |
| `REJECTION_REASON_LABELS` | Modal / history |
| `labelScenario`, `labelSentiment`, `labelPriority`, `labelModeration`, `labelPublication`, … | Display helpers |
| `labelTemplateDescriptor` | Template line under AI panel |
| `isOperatorWorkflowCompleted` | `approved` + `published` |
| `WORKFLOW_COMPLETED_TOOLTIP` | «Ответ уже отправлен клиенту» |

`frontend/src/ops/operator/operatorLabels.js` — re-exports display labels + operator timeline strings only.

---

## Mappings added (canonical → RU)

**Scenario:** question → Вопрос, complaint → Жалоба, gratitude → Благодарность, suggestion → Предложение (+ legacy delivery_delay, …).

**Sentiment:** positive → Позитивная, neutral → Нейтральная, negative → Негативная, aggressive → Агрессивная.

**Priority:** low/medium/high/critical → Низкий/Средний/Высокий/Критический.

**Moderation:** pending_review → На проверке, approved → Одобрено, rejected → Отклонено, needs_revision → На доработке.

**Publication:** published → Опубликовано, not_published → Не опубликовано, …

---

## UI sections localized

| Section | Changes |
|---------|---------|
| Queue filters | Option labels via `labelModeration` / `labelPriority` / `labelScenario` / `labelSentiment`; values unchanged |
| Queue item status | `labelModeration` (already) |
| Queue telemetry | `labelAiDraftStatus`, `labelScenario`, `labelModeration`, `labelPublication` |
| Detail metadata | Сценарий, тональность, приоритет |
| Template footer | `labelTemplateDescriptor` |
| Rejection modal selects | RU labels, canonical `value` |
| Timeline | Uses re-exported `labelModeration` / `labelPublication` |

Layout / proportions: **not changed**.

---

## Completed workflow lock

**Rule:** `isOperatorWorkflowCompleted(detail)` ⇔ `moderation_status === "approved"` && `publication_status === "published"` (matches `approve_review` in backend).

**UI:**

- `OperatorModerationWorkspace` — both action buttons `disabled` when completed (or loading); `title={WORKFLOW_COMPLETED_TOOLTIP}`.
- `OperatorReviewsPage` — reject modal not opened if already completed.
- CSS: `.rf-oc-editor-actions .op-btn:disabled` — reduced opacity, `not-allowed` cursor.

**Still enabled when:** pending_review, needs_revision, manual_override (not published), rejected, etc.

Buttons remain visible in header (not hidden).

---

## Explicit confirmation

- [x] Search/layout unchanged (020J scope).
- [x] Canonical values unchanged in API payloads and filter `value` attributes.
- [x] No ad-hoc RU strings for enums in operator JSX (uses `displayLabels` helpers / maps).
- [x] Workflow lock only after successful pipeline completion.

## BEFORE/AFTER screenshots

Не снимались (headless environment).

## Build result

```text
vite v6.4.2 — ✓ built in ~2.6s (107 modules)
```
