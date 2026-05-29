# Sprint 022A — Controlled Hybrid Transition Inventory / Forensics

**Date:** 2026-05-30  
**Status:** Completed  
**Type:** Read-only forensic inventory (код, БД, UI не изменялись)

**Task source:** `cursor_tasks_local/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`

---

## Executive summary

Review Flow сегодня — **template-guided LLM pipeline** с human-in-the-loop moderation. Бизнес-решение фактически собирается из:

1. fuzzy match типовой **фразы** (`review_phrase_patterns`);
2. **LLM-классификации** С/Т/П (с опциональным override из фразы);
3. **scoring-выбора шаблона** по FK `scenario_id` / `sentiment_id` / `priority_id` (`response_templates`);
4. **LLM-генерации** draft по шаблону;
5. **ручной модерации** оператором (approve → mock publication).

Сущности **«response case» (типовая ситуация ответа как SOT)** в репозитории **нет**. Ближайшие фрагменты: связка справочников С/Т/П + один шаблон + опциональная фраза-пример. Это **конфликтует** с Controlled Hybrid (CH), где case — первичная бизнес-сущность, retrieval выбирает case, LLM только адаптирует утверждённый ответ.

**Сильные стороны для перехода:** принятый customer UI (номера `NL-XXXXXXXX-NNN`, status dialog), зрелая operator console (очередь, reject-feedback, lifecycle), admin KB workspace, FK-справочники (021A), operational logs, rejection feedback как зачаток KB loop.

**Главный разрыв CH:** decision source = LLM classification + heuristic template pick, а не retrieval → confidence → linked response case → approved policy/template.

---

## UI contour inventory

### 1. Customer UI (highest priority)

| Field | Value |
|-------|--------|
| **Contour name** | Client / customer-facing |
| **Routes** | `/`, `/review`, `/review/status`, `/review/status/:requestNumber` |
| **Layout** | `frontend/src/layouts/ClientLayout.jsx` |
| **Main pages** | `HomePage.jsx`, `ReviewPage.jsx`, `ReviewStatusLookupPage.jsx`, `ReviewStatusPage.jsx` |
| **Components** | `ReviewCreationModal.jsx`, `ReviewFormFields.jsx`, `StatusLookupModal.jsx`, `StatusModalPanel.jsx`, `StatusStepper.jsx`, `StatusDialogVisual.jsx`, `ClientModal.jsx`, `useReviewForm.js` |
| **Roles** | Implicit `client` (no auth; public) |
| **API (customer)** | `POST /api/reviews` (plain `fetch`, no X-Role); `GET /api/reviews/requests/{request_number}/status?email=` (`reviewStatus.js`) |
| **Implemented scenarios** | Просмотр маркетинговой главной; создание отзыва (modal); success с номером обращения; проверка статуса (modal + full page); просмотр stepper lifecycle; при `published` — показ `final_response` |
| **Modals** | Review creation; status lookup (embedded in home/review flows via `ClientModalContext`) |
| **Accepted behavior (session logs)** | **018B:** единый формат `NL-XXXXXXXX-NNN`, без `_`/`#`/UUID в UI; status dialog по reference. **014+:** customer status tracking. |
| **CH gaps** | Нет понятия response case / confidence для клиента (ожидаемо). Клиент видит pipeline status, не business case. Сохранить UX submit/status/published response. |

### 2. Operator UI (highest priority)

| Field | Value |
|-------|--------|
| **Contour name** | Company workspace — Operator |
| **Routes** | `/operator/reviews` (under `CompanyLayout`) |
| **Main files** | `OperatorReviewsPage.jsx`, `OperatorLeftPanel.jsx`, `OperatorModerationWorkspace.jsx`, `OperatorQueueItem.jsx`, `RejectionFeedbackModal.jsx`, `OperatorLifecycleTimeline.jsx`, `operatorTimeline.js`, `operatorUtils.js`, `operator-console.css` |
| **Roles** | `operator` (`X-Role: operator` via `apiFetch`) |
| **API** | `GET/POST /api/operator/reviews/*`, `GET /api/reference/classification` |
| **Implemented scenarios** | Очередь (до 100 items); фильтры moderation (server) + scenario/sentiment/priority/search (client); карточка: metadata, AI draft, editor, approve+publish, reject-feedback modal |
| **Actions** | Одобрить и отправить (`POST .../approve`); отклонить AI draft (`POST .../reject-feedback` only in UI — **не** `.../reject` / `.../revision`) |
| **Accepted (session logs)** | **020E–020I:** AF-aligned console layout, dual metadata panels, search row. **020G:** rejection modal v2 + backend `rejection_feedback`. **020J:** lock actions after `approved`+`published`, RU labels. **021A:** classification correction via reference UUID selects. |
| **CH gaps** | Нет candidate response cases, confidence, case picker, «создать новый case», policy per case, auto-publish rules. Classification shown as S/Т/П refs, not «выбранный case». |

### 3. Admin UI

| Field | Value |
|-------|--------|
| **Contour name** | Company workspace — Administrator |
| **Routes** | `/prompts`, `/evaluation`, `/analytics`, `/logs`, `/settings/ai-providers`, `/admin/phrases`, `/admin/templates`, `/admin/scenarios`, `/admin/sentiments` |
| **Nav** | `ops/nav/companyNavModel.js` |
| **KB** | `KnowledgeBaseWorkspace.jsx` + `kbModel.js` (phrases, templates, scenarios, sentiments) |
| **Other pages** | `PromptsPage`, `EvaluationPage`, `AnalyticsPage`, `LogsPage`, `AiProvidersPage` |
| **Roles** | `administrator` |
| **API** | `/api/admin/*`, `/api/prompts`, `/api/evaluation/cases`, `/api/analytics/overview`, `/api/logs`, `/api/settings/ai-providers` |
| **CH gaps** | Нет CRUD «response case»; phrases/templates managed separately; нет versioning case, review queue for new situations, miss analytics tied to case |

### 4. Additional contour — Company shell

| Field | Value |
|-------|--------|
| **Routes** | `/company` → `CompanyHomePage` (redirect by role) |
| **Purpose** | Role selector (`RoleContext`), shared sidebar shell |
| **Note** | Single SPA; not physically separate deployables (README: MVP role selector) |

---

## Customer UI inventory (detailed)

### Pages and actions

| Page / surface | Path | Actions |
|----------------|------|---------|
| Home | `/` | Open review modal; open status check |
| Review | `/review` | Submit review form |
| Status lookup | `/review/status` | Enter request number + email |
| Status detail | `/review/status/:requestNumber` | View status (email from query) |

### Submit and status flow

- **Submit:** `useReviewForm` → `POST /api/reviews` → triggers full backend pipeline synchronously; returns `request_number`, `review_id`, `status`.
- **Status:** `fetchReviewStatus` → `GET /api/reviews/requests/{NL-...}/status?email=`; email required (404 if mismatch).

### Visible statuses (client mapping in `reviews.py`)

Backend derives `client_status` from `moderation_status` + `publication_status`:

| Client `status` | Condition |
|-----------------|-----------|
| `published` | `publication_status == published` and `final_response` |
| `rejected` | `moderation_status == rejected` |
| `needs_revision` | `needs_revision` |
| `pending_review` | `pending_review` |
| `approved` | `approved` (not yet published text rules) |
| `processing` | default |

UI labels: `displayLabels.REVIEW_STATUS_LABELS` / `StatusStepper`.

### Does customer see AI / moderation?

| Data | Shown? |
|------|--------|
| Own review text | Yes |
| `final_response` when published | Yes |
| AI draft | **No** (only after publish as company response) |
| Moderation enum directly | **No** (mapped to friendly `status`) |
| Classification S/Т/П | **No** |
| Internal `review_id` UUID in main flows | **No** (request_number only; 018B) |

### Must not break during CH transition (evidence-based)

- Request number format `NL-XXXXXXXX-NNN` and lookup by email.
- Review submission modal + success copy number.
- Status dialog/stepper UX (018B reference).
- Published final response visibility.
- No leakage of operator/admin surfaces into client routes.

### CH-required customer changes (planning only)

- Likely **minimal** if CH is backend-internal; possible new statuses if case-level policies add customer-visible states — **Unknown from current repository snapshot** until CH product spec extends client contract.

---

## Operator UI inventory (detailed)

### Queue and filters

- **List:** `GET /api/operator/reviews?moderation_status=` (optional); limit 100; scenario/sentiment/priority filters **client-side** on list item codes.
- **Pagination:** client-side pages of 10.
- **Counters:** `queueCounters` — total, pending, approved, rejected, revision, published.

### Detail view

- Customer/order metadata (two columns).
- Classification: scenario, sentiment, priority (nested refs from API).
- Matched phrase text footer on customer panel.
- Template label on AI panel.
- Collapsible review / AI draft.
- Operator response editor (`final_response`); prefill from draft.
- Lifecycle timeline from `operational_logs` event types.
- Rejection history (`rejection_feedback_history`).

### Actions

| Action | Endpoint | Effect |
|--------|----------|--------|
| Approve and send | `POST .../approve` `{ final_response }` | `moderation_status=approved`, `publication_status=published`, `final_response` set |
| Reject (UI) | `POST .../reject-feedback` | See rejection reasons below; sets `needs_revision` on response |

**Not wired in frontend:** `POST .../reject`, `POST .../revision` (exist in `operator.py`).

### Rejection reasons (`RejectionFeedbackModal`, backend `REJECTION_REASONS`)

1. `classification_error` — correct S/Т/П via `operator_corrected_*_id` (must change at least one).
2. `unsuitable_template` — reason only (+ comment).
3. `history_ignored` — reason only (+ comment).

On `classification_error`, backend updates `review_classifications` FK ids and appends `rejection_feedback` row.

### CH-required operator changes (planning)

| CH capability | Current |
|---------------|---------|
| Candidate response cases | Absent |
| Match confidence | Only `phrase_match_score` / `classification.confidence` in data, **not** case confidence |
| Select / override case | Absent |
| Propose new case | Absent |
| Approved template per case | Implicit via `response_templates` + pipeline pick |
| KB feedback loop | Partial via `rejection_feedback` only |

---

## Admin UI inventory (detailed)

### KB screens (`KnowledgeBaseWorkspace`)

| Entity | Route | API | Fields (021A) |
|--------|-------|-----|----------------|
| Phrases | `/admin/phrases` | `/api/admin/phrases` | `phrase_text`, `scenario_id`, `sentiment_id`, `priority_id`, `is_active` |
| Templates | `/admin/templates` | `/api/admin/templates` | `title`, S/T/P ids, `template_text`, `is_fallback`, `is_active` |
| Scenarios | `/admin/scenarios` | `/api/admin/scenarios` | `code`, `title`, `description`, `is_active` |
| Sentiments | `/admin/sentiments` | `/api/admin/sentiments` | same pattern |

Reference options: `GET /api/reference/classification` (admin role allowed).

**Relationship visibility:** KB shows linked phrases/templates when editing scenario/sentiment (by ref id).

### Other admin surfaces

| Screen | Purpose |
|--------|---------|
| Prompts | Versioned `review_classification` + `review_response_generation` prompts |
| Evaluation | Manual `evaluation_cases` linked to `review_id`, operator score/comment |
| Analytics | Aggregates: counts, rating/scenario/sentiment/priority distributions |
| Logs | `operational_logs` feed |
| AI providers | Enable/activate/fallback/test providers |

### Is there a «response case» entity?

**No.** Closest mappings for CH planning:

| CH target (conceptual) | Existing entity | Notes |
|------------------------|-----------------|-------|
| `response_cases` | *None* | Could be new aggregate over situation semantics |
| `response_case_patterns` | `review_phrase_patterns` | Examples for fuzzy match, not case SOT |
| `response_case_templates` | `response_templates` | One template per S/T/P tuple, not per case id |
| `response_case_versions` | *None* | Prompt versions exist, not case versions |
| `response_case_feedback` | `rejection_feedback` | Per review rejection, not case lifecycle |
| `response_case_decisions` | `review_classifications` | Per inbound review, LLM-driven |
| `case_match_results` | phrase match fields on classification | Not generalized |
| `operator_review_events` | `operational_logs` + moderation actions | Partial |
| `knowledge_base_change_requests` | *None* | |

**De facto routing key today:** `(scenario_id, sentiment_id, priority_id)` + optional phrase boost — **not** a stable case record with policy.

### CH-required admin changes (planning)

- Response case CRUD with one approved template/policy per case.
- Patterns as examples attached to case (not free-floating S/T/P strings).
- Versioning / activate-deactivate cases.
- Queue for unknown / low-confidence situations.
- Analytics: misses, operator overrides, case hit rate.

---

## Backend pipeline inventory

Entry: `POST /api/reviews` → `ReviewPipeline.ingest_and_process` → `_run_processing`.

| Step | Service / function | Decision source | Persisted | CH conflict | Reuse |
|------|-------------------|-----------------|-----------|-------------|-------|
| 1 Ingest | `pipeline._get_or_create_customer`, `_create_service_case`, `_create_review` | Form payload | `customers`, `service_cases`, `reviews` | Review-centric, not case-centric | **Modify** (add case link later) |
| 2 Phrase match | `PhraseMatchingService.match` | `rapidfuzz.token_set_ratio` ≥ 55 | via classification: `matched_phrase_id`, `phrase_match_score`, `classification_source` | Retrieval is phrase-not-case; threshold heuristic | **Replace** with case retrieval |
| 3 LLM classify | `ClassificationService.classify` | **LLM JSON** (+ phrase override) | codes → FK in classification | **P0 conflict:** LLM owns S/Т/П | **Replace** with case match + signals |
| 4 FK resolve | `ClassificationRefsService.resolve_codes` | Reference tables | `scenario_id`, `sentiment_id`, `priority_id` | S/T/P taxonomy ≠ case taxonomy | **Modify** (case may embed or replace) |
| 5 Template select | `TemplateSelectionService.select` | In-memory score on FK ids | `review_responses.template_id` | Not case-linked; heuristic | **Replace** with case→approved template |
| 6 LLM generate | `ResponseGenerationService.generate` | LLM text from template context | `draft_response`, `generation_metadata` | OK if CH allows adaptation only | **Reuse with changes** (policy-bound) |
| 7 Persist response | `pipeline` | — | `review_responses` row | — | **Modify** |
| 8 Moderation | `moderation.approve_review`, `submit_ai_draft_rejection_feedback` | Operator | `final_response`, statuses, `rejection_feedback` | No case-level policy (auto vs manual) | **Modify** |
| 9 Ops log | `log_event` | — | `operational_logs` | — | **Reuse as-is** |

Detailed forensic reference: `docs/cursor_sessions/2026-05-30_sprint_021b_pipeline_forensics_template_selection_and_classification.md`.

---

## Database inventory

| Table / entity | Purpose today | Important fields | Used by | CH relation | Action |
|----------------|---------------|------------------|---------|-------------|--------|
| `customers` | Client identity | email, name, segment | ingest, status auth | Customer remains | **Keep** |
| `service_cases` | Order/case context | case_title, product_area | ingest, operator display | Not response case | **Keep** / clarify naming |
| `reviews` | Inbound request SOT | review_text, rating, request_number, order_number | all contours | Becomes «incoming request» not «case decision» | **Keep** |
| `interaction_scenarios` | Scenario ref | scenario_code, scenario_name | classification, KB, FK | Dimension of case, not case itself | **Keep** as attribute or tag |
| `sentiment_profiles` | Sentiment ref | sentiment_code | same | same | **Keep** |
| `priority_levels` | Priority ref (021A) | priority_code, sort_order | same | same | **Keep** |
| `review_phrase_patterns` | Phrase examples + S/T/P hints | phrase_text, *_id, fuzzy match | pipeline, KB | Maps to `response_case_patterns` | **Modify** |
| `response_templates` | Template per S/T/P tuple | template_text, *_id, is_fallback | pipeline, KB, operator | Maps to approved template **per case** in CH | **Modify** |
| `review_classifications` | LLM classification result | *_id, confidence, matched_phrase_id, source | pipeline, operator | Maps to `response_case_decisions` / match metadata | **Modify** |
| `review_responses` | Draft/final answer | draft, final, moderation, publication, template_id | operator, customer status | Outcome of case policy | **Keep** |
| `rejection_feedback` | Operator reject audit | reason, llm/corrected *_id | operator | Maps to `response_case_feedback` | **Modify** |
| `prompt_versions` | LLM prompts | prompt_key, system/user templates | admin, pipeline | Supporting, not case SOT | **Keep** |
| `operational_logs` | Pipeline/moderation events | event_type, metadata | operator, logs UI | Audit trail | **Keep** |
| `evaluation_cases` | Manual QA | review_id, score, comment | evaluation UI | Offline from case model | **Keep** / extend |
| `evaluation_results` | Batch eval (schema) | expected/predicted *_id (021A SQL) | limited | CH evaluation | **Modify** |
| `ai_provider_settings` | Provider config | provider_key, is_active | admin | Infra | **Keep** |
| `rejection_feedback` | (see above) | | | | |
| `review_analytics` | (001 schema) | Unknown active use in API | **Unknown from current repository snapshot** | | |

**Target entities to add (CH):** `response_cases`, `response_case_patterns`, `response_case_templates`, `response_case_versions`, `response_case_feedback`, `response_case_decisions`, `case_match_results`, `operator_review_events`, `knowledge_base_change_requests` — **none exist today**.

---

## API inventory

| Endpoint | Method | UI contour | Purpose | CH impact | Action |
|----------|--------|------------|---------|-----------|--------|
| `/health` | GET | ops | health | — | Keep |
| `/api/reviews` | POST | Customer | ingest + full pipeline | Add case resolution in response optional | Modify |
| `/api/reviews/requests/{request_number}/status` | GET | Customer | status by email | Preserve contract | Keep |
| `/api/reviews/{review_id}/status` | GET | Rare/debug | status | — | Keep |
| `/api/reviews/{review_id}` | GET | Unknown customer use | detail with classification | — | Keep |
| `/api/operator/reviews` | GET | Operator | queue | Add case candidates later | Modify |
| `/api/operator/reviews/{id}` | GET | Operator | detail | Add case match block | Modify |
| `/api/operator/reviews/{id}/approve` | POST | Operator | publish | Tie to case policy | Modify |
| `/api/operator/reviews/{id}/reject-feedback` | POST | Operator | structured reject | Extend for case feedback | Modify |
| `/api/operator/reviews/{id}/reject` | POST | *unused UI* | hard reject | — | Deprecate or wire |
| `/api/operator/reviews/{id}/revision` | POST | *unused UI* | needs_revision | — | Deprecate or wire |
| `/api/reference/classification` | GET | Operator, Admin KB | S/T/P dictionary | May become subset of case attrs | Modify |
| `/api/admin/phrases` | CRUD | Admin | phrase patterns | Attach to case id | Modify |
| `/api/admin/templates` | CRUD | Admin | templates | Link to case id | Modify |
| `/api/admin/scenarios` | CRUD | Admin | scenarios | Keep as ref | Keep |
| `/api/admin/sentiments` | CRUD | Admin | sentiments | Keep as ref | Keep |
| `/api/prompts` | CRUD | Admin | prompt versions | Adaptation-only prompts | Modify |
| `/api/evaluation/cases` | CRUD | Admin | manual eval | Case-based eval later | Modify |
| `/api/analytics/overview` | GET | Admin | dashboards | Case hit/miss metrics | Modify |
| `/api/logs` | GET | Admin | operational logs | — | Keep |
| `/api/settings/ai-providers` | * | Admin | AI config | — | Keep |

---

## Controlled Hybrid gap analysis

| Gap ID | Area | Current state | Target CH state | Impact | Cycle | Priority |
|--------|------|---------------|-----------------|--------|-------|----------|
| G-01 | Backend | LLM sets S/Т/П primary | Case retrieval sets business decision | Blocks CH | 6 Pipeline | **P0** |
| G-02 | DB | No `response_cases` | Case = SOT of situation | Blocks CH | 2 Data foundation | **P0** |
| G-03 | Backend | Template scoring by S/T/P | One approved template per case | Blocks CH | 6 Pipeline | **P0** |
| G-04 | Operator UI | Shows classification only | Show selected case + confidence + candidates | Required for ops | 4 Operator CH | **P1** |
| G-05 | Admin UI | Separate phrases/templates | Case-centric KB | Required for KB | 5 Admin cases | **P1** |
| G-06 | Backend | Phrase fuzzy match | Case retrieval with confidence tiers | Core retrieval | 6 Pipeline | **P1** |
| G-07 | Operator UI | No «create case» flow | Low confidence → propose case | KB growth | 4 Operator CH | **P1** |
| G-08 | Customer UI | Pipeline statuses | Preserve; optional case-agnostic | Owner acceptance | 3 Customer | **P1** |
| G-09 | Docs | SOT describes LLM classification pipeline | CH architecture documented | Planning | 1 SOT/CH | **P0** |
| G-10 | Backend | `rejection_feedback` per review | Case-level feedback loop | Quality | 7 Eval/audit | **P2** |
| G-11 | Admin | No case versioning | `response_case_versions` | Governance | 5 Admin cases | **P2** |
| G-12 | Backend | No auto-publish policy | Policy per case | Automation | 6 Pipeline | **P2** |
| G-13 | Admin | Evaluation disconnected from cases | Eval per case/version | Quality | 7 Eval/audit | **P3** |
| G-14 | Operator | `/reject` `/revision` unused | Align or remove | Cleanup | 4 Operator CH | **P3** |

### Distance from CH target flow

| CH stage | Current implementation |
|----------|------------------------|
| Incoming request | **Exists** (`reviews`) |
| Normalization / signals | Partial (rating, product_area, phrase hint to LLM) |
| Retrieval vs response cases | **Missing** (phrase fuzzy only) |
| Confidence assessment | Partial (`phrase_match_score`, `confidence`); no branch |
| High → linked case | **Missing** |
| Medium → operator picks candidate | **Missing** |
| Low → operator + new case | **Missing** |
| Approved template / policy | **De facto** template row per S/T/P, not per case |
| LLM adaptation | **Exists** (`ResponseGenerationService`) |
| Operator review | **Exists** (approve / reject-feedback) |
| Feedback → KB | **Partial** (`rejection_feedback` only) |

---

## Proposed implementation cycles

Rule: each cycle delivers **all scenarios** for its UI contour; completion = **owner acceptance** only.

| # | Cycle name | Scope | Delivers |
|---|------------|-------|----------|
| C1 | SOT / CH architecture | Docs | CH principles, entity model, migration principles; update SOT §5–§8, IMPLEMENTATION_PLAN |
| C2 | Data model foundation | DB + backend models | `response_cases` (+ patterns, templates, versions); migration from phrases/templates; read APIs |
| C3 | Customer UI preservation | Customer contour | Regression: submit, NL-number, status dialog, published response; no regression from CH backend flags |
| C4 | Operator UI — CH scenarios | Operator contour | Case candidates, confidence, select/override case, reject/feedback tied to case, preserve 020J lock |
| C5 | Admin UI — response case management | Admin contour | Case CRUD, patterns per case, one approved template, activate/version; migrate KB UX |
| C6 | Backend pipeline transition | Cross-cutting | Case retrieval → decision branch → policy template → bounded LLM adapt; deprecate LLM-primary classify |
| C7 | Evaluation / audit / analytics | Admin + backend | Case hit rate, miss log, rejection→case proposals, extend analytics |

Order: **C1 → C2 → C6** (foundation), then **C3** in parallel where possible, then **C4 + C5**, then **C7**.

---

## Risks and unknowns

| Item | Note |
|------|------|
| CH product spec beyond task file | No authoritative CH UI wireframes in repo — operator case picker UX **unknown** |
| `review_analytics` table | In 001 schema; **no ORM/API usage found** in inspected code |
| `evaluation_results` | FK columns in migration 010; **no SQLAlchemy model** in backend |
| Owner sign-off list | Inferred from session logs 018B, 020G–020K, 021A — not a formal acceptance registry |
| Auto-publication | Not implemented; CH policy per case TBD |
| Multi-template per case | Current templates keyed by S/T/P; CH «one approved template per case» may require data migration rules |
| Customer role auth | Email-only gate for status; CH may need stricter identity — **unknown** |

---

## Documentation / SOT / registers (inventory)

| Artifact | CH relevance |
|----------|----------------|
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | Describes LLM classification + template pipeline (§5–§8); 021A FK note; **needs CH section** |
| `IMPLEMENTATION_PLAN.md` | Milestones 1–5 + sprint history; 021A note; **needs CH roadmap** |
| `README.md` | Accurate contour/route map; states template-guided flow |
| `docs/architecture/ui_contour_separation_plan.md` | Referenced in README — contour separation intent |
| Session logs `docs/cursor_sessions/2026-05-*` | Accepted UI behaviors (operator console, customer IDs, localization, FK) |

---

## Files inspected

### Documentation
- `cursor_tasks_local/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`
- `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` (sections 4–12, grep)
- `IMPLEMENTATION_PLAN.md`
- `README.md`
- `docs/cursor_sessions/2026-05-27_cursor_task_018B_status_dialog_and_review_id_normalization.md`
- `docs/cursor_sessions/2026-05-29_sprint_020j_operator_console_localization_and_finalization.md`
- `docs/cursor_sessions/2026-05-30_sprint_021b_pipeline_forensics_template_selection_and_classification.md`
- `docs/cursor_sessions/2026-05-29_sprint_021a_normalize_classification_reference_data_fk.md` (summary)

### Frontend
- `frontend/src/App.jsx`
- `frontend/src/layouts/ClientLayout.jsx`, `CompanyLayout.jsx`
- `frontend/src/pages/HomePage.jsx`, `ReviewPage.jsx`, `ReviewStatusLookupPage.jsx`, `ReviewStatusPage.jsx`
- `frontend/src/components/client/*` (modal, status, form)
- `frontend/src/hooks/useReviewForm.js`
- `frontend/src/lib/reviewStatus.js`, `api.js`, `displayLabels.js`, `classificationReference.js`
- `frontend/src/pages/OperatorReviewsPage.jsx`
- `frontend/src/ops/operator/*`
- `frontend/src/ops/kb/KnowledgeBaseWorkspace.jsx`, `kbModel.js`
- `frontend/src/pages/admin/*`, `PromptsPage.jsx`, `EvaluationPage.jsx`, `AnalyticsPage.jsx`, `LogsPage.jsx`, `AiProvidersPage.jsx`
- `frontend/src/ops/nav/companyNavModel.js`

### Backend
- `backend/app/main.py`
- `backend/app/api/*.py` (all routers)
- `backend/app/services/pipeline.py`, `phrase_matching.py`, `classification.py`, `classification_refs.py`, `template_selection.py`, `response_generation.py`, `moderation.py`, `prompt_service.py`
- `backend/app/models/entities.py`
- `backend/app/schemas/review.py`, `operator.py`, `admin.py`, `reference.py`, `classification.py`
- `backend/migrations/*.sql` (list)

### Database
- `infra/db/migrations/001_initial_schema.sql` (table list)
- `backend/migrations/010_classification_reference_fk.sql` (reference)

---

## Statement of work performed

**No code, database, or UI changes were made.** This session log is a read-only transition inventory for Controlled Hybrid planning.

---

## FULL PROMPT
# Sprint 022A — Controlled Hybrid Transition Inventory / Forensics

## Type

Read-only forensic inventory.

No code changes.  
No database migrations.  
No UI changes.  
No refactoring.  
No cleanup.  
No “quick fixes”.

The purpose of this task is to inspect the current Review Flow repository and prepare a factual transition map from the current implementation to the target Controlled Hybrid architecture.

---

## Business context

The project is being reoriented around the Controlled Hybrid business model.

Target principle:

```text
Typical response situation / response case = SOT of business decision.

Retrieval finds the most suitable response case.

Each response case has a strictly defined approved response template or response policy.

LLM may adapt text, extract signals, or assist with drafting, but must not be the primary source of business decision.

Operator validates uncertain/new cases and improves the knowledge base.

Backend owns rules, thresholds, lifecycle, audit, statuses, and persistence.
```

Important:

The existing implementation must not be treated as the target architecture.

Current code is only a factual source for inventory:
- what already exists;
- what can be reused;
- what conflicts with Controlled Hybrid;
- what must be changed;
- what must be preserved because it was already accepted by the system owner.

---

## Main objective

Prepare a precise factual inventory of the current project state for planning the transition to Controlled Hybrid.

The report must answer:

1. What UI contours already exist?
2. What business scenarios are already implemented in each UI contour?
3. What backend APIs support those UI contours?
4. What database entities and fields support those scenarios?
5. What parts of the current implementation conflict with the Controlled Hybrid model?
6. What parts can be reused with minimal changes?
7. What changes will be required for:
   - customer UI;
   - operator UI;
   - admin UI;
   - backend API;
   - database schema;
   - SOT project documentation;
   - implementation plan and related registers.

---

## Priority order

Use this priority order in the report:

1. Customer UI — highest priority.
2. Operator UI — highest priority.
3. Admin UI.
4. Backend/API.
5. Database/schema.
6. Documentation/SOT/registers.

Do not start from backend assumptions.

Start from actual user-facing and operator-facing scenarios.

---

## Required reading / inspection

Inspect the actual repository.

At minimum inspect:

### Documentation

- current project SOT document;
- implementation plan;
- README / project overview if present;
- cursor session logs relevant to accepted UI work;
- any architecture or product decision documents.

### Frontend

Inspect all actual UI contours:

- customer-facing UI;
- operator UI;
- admin UI;
- routing;
- pages;
- components;
- API clients;
- state management;
- forms;
- modals;
- filters;
- lifecycle/status displays.

### Backend

Inspect:

- API routes;
- services;
- pipeline/orchestration;
- models/entities;
- schemas/serializers;
- migrations;
- prompt management;
- classification services;
- template selection services;
- phrase matching / retrieval-like services;
- moderation / rejection feedback services;
- admin CRUD services.

### Database

Inspect current models/migrations and infer actual tables/fields:

- reviews / customer requests;
- customers;
- service cases/orders;
- classifications;
- phrase patterns;
- response templates;
- responses/drafts;
- moderation/rejection feedback;
- reference tables;
- prompts;
- operational logs;
- any evaluation or audit tables.

---

## Controlled Hybrid target entities to keep in mind

Do not implement these in this task, but use them as the target lens.

Potential target entities:

```text
response_cases
response_case_patterns
response_case_templates
response_case_versions
response_case_feedback
response_case_decisions
case_match_results
operator_review_events
knowledge_base_change_requests
```

The exact names are not fixed yet.

This task must help decide which of these are required and how they map to existing data structures.

---

## Key target business logic

In the target architecture:

```text
Incoming request
↓
normalization / signal extraction
↓
retrieval or matching against response cases
↓
confidence assessment
↓
decision branch:
  high confidence → linked response case
  medium confidence → operator chooses among candidates
  low confidence → operator handles and may create new response case
↓
approved response template / response policy
↓
LLM adaptation if allowed
↓
operator review or auto-publication depending on response case policy
↓
feedback loop into knowledge base
```

The report must show how far the current implementation is from this model.

---

## Questions to answer

### 1. UI contour inventory

For each UI contour, provide:

```text
Contour name
Route(s)
Main page/component files
Supported user roles
Implemented screens
Implemented actions
Implemented modals/dialogs
API endpoints used
Current business scenarios
Accepted/owner-approved behavior if visible from docs/session logs
Known gaps for Controlled Hybrid
```

Required contours:

1. Customer UI.
2. Operator UI.
3. Admin UI.

If there are additional contours, list them separately.

---

### 2. Customer UI inventory

Answer specifically:

1. What customer-facing pages exist?
2. What customer actions are implemented?
3. How does the customer submit or view a review/request?
4. What statuses are visible to customer?
5. What lifecycle is shown to customer?
6. Does customer see AI-generated text?
7. Does customer see moderation state?
8. Which parts were recently accepted by the owner and should be preserved?
9. What changes would Controlled Hybrid require in customer UI?
10. What must not be broken during transition?

---

### 3. Operator UI inventory

Answer specifically:

1. What operator queue/list exists?
2. What statuses and filters exist?
3. What detail view exists?
4. What actions are available?
5. How does approve/send work?
6. How does reject work?
7. What rejection reasons exist?
8. How are classification corrections handled?
9. What metadata is shown?
10. What lifecycle/pipeline diagnostics are shown?
11. Which operator UI behavior was already accepted by the owner?
12. What changes would Controlled Hybrid require:
    - candidate response cases;
    - confidence;
    - selected response case;
    - override/choose another case;
    - create new response case proposal;
    - approve adapted response;
    - send to customer;
    - feedback to KB?

---

### 4. Admin UI inventory

Answer specifically:

1. What admin KB screens exist?
2. What can admin manage now:
   - phrase patterns;
   - templates;
   - scenarios;
   - sentiments;
   - priorities;
   - prompts;
   - settings;
   - other reference data?
3. How are phrase patterns linked to classification?
4. How are templates linked to classification?
5. Is there currently a single entity equivalent to “response case”?
6. If not, what existing entities could be merged or mapped into response cases?
7. What CRUD/API is available?
8. What changes would Controlled Hybrid require:
   - response case management;
   - patterns/examples for a case;
   - one approved response template per case;
   - lifecycle/versioning;
   - activation/deactivation;
   - review queue for new/unknown situations;
   - analytics of misses and operator corrections?

---

### 5. Backend pipeline inventory

Describe the current actual pipeline step by step.

At minimum identify:

1. Entry points.
2. Ingest flow.
3. Phrase matching / retrieval-like logic.
4. LLM classification.
5. FK reference resolution.
6. Template selection.
7. LLM generation.
8. Persistence of classifications and responses.
9. Moderation workflow.
10. Operational logging.

For each step, indicate:

```text
Current service/function
Current source of decision
Current persisted fields
Conflict with Controlled Hybrid, if any
Reusable as-is / reusable with changes / replace
```

---

### 6. Database inventory

Prepare a concise table:

```text
Table/entity
Purpose today
Important fields
Used by UI/API
Relation to Controlled Hybrid
Keep / modify / replace / add target entity
```

Pay special attention to:

- review_phrase_patterns;
- response_templates;
- review_classifications;
- rejection_feedback;
- interaction_scenarios;
- sentiment_profiles;
- priority_levels;
- operational logs;
- prompt versions;
- review responses.

---

### 7. API inventory

Prepare a concise table:

```text
Endpoint
Method
Used by which UI contour
Current purpose
Current payload/response essence
CH impact
Keep / modify / add / deprecate
```

Do not invent endpoints.

Only list endpoints that exist in the repository.

---

### 8. Gap analysis

Prepare a Controlled Hybrid gap list.

Use this structure:

```text
Gap ID
Area: UI customer / UI operator / UI admin / backend / DB / docs
Current state
Target CH state
Impact
Suggested implementation cycle
Priority
```

Priorities:

```text
P0 — blocks CH architecture
P1 — required for accepted UI scenario
P2 — improves operations/quality
P3 — later enhancement
```

---

### 9. Proposed implementation cycles

Do not implement them.

Only propose operational cycles.

Each cycle must be aligned with one UI contour or one cross-cutting foundation.

Required rule:

Each operational cycle must include development/delivery of all possible scenarios inside the selected UI contour.

Acceptance SOT:

```text
Only owner acceptance completes the cycle.
```

Expected cycles may include:

1. SOT / CH architecture update cycle.
2. Data model foundation cycle.
3. Customer UI preservation/adaptation cycle.
4. Operator UI CH scenario cycle.
5. Admin UI response case management cycle.
6. Backend pipeline transition cycle.
7. Evaluation/audit/analytics cycle.

But use actual repository findings to propose final cycle list.

---

## Output format

Create a session log:

```text
docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md
```

The session log must contain:

1. FULL PROMPT.
2. Executive summary.
3. UI contour inventory.
4. Customer UI inventory.
5. Operator UI inventory.
6. Admin UI inventory.
7. Backend pipeline inventory.
8. Database inventory.
9. API inventory.
10. Controlled Hybrid gap analysis.
11. Proposed implementation cycles.
12. Risks and unknowns.
13. Clear list of files inspected.
14. Statement that no code/database/UI changes were made.

---

## Strict constraints

Do not modify files.

Do not create migrations.

Do not change frontend.

Do not change backend.

Do not reformat code.

Do not “improve” anything.

Do not infer accepted owner decisions unless supported by docs/session logs or visible current implementation.

If something is unknown, write:

```text
Unknown from current repository snapshot.
```

Do not guess.

---

## Final response in Cursor chat

After completing the task, respond briefly in chat:

```text
Done. Read-only inventory completed.
Session log: docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md
No code changes were made.
```
