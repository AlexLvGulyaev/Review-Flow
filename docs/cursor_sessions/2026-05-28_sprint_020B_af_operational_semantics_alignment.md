# Session log — Sprint 020B: AF operational semantics alignment

Date: 2026-05-28  
Workspace: `review-flow`  
Task file: `cursor_tasks_local/sprint_020b_af_operational_semantics_alignment.md`

---

## 0. Full task prompt (verbatim)

```md
# Sprint 020B — AF Operational Semantics Alignment

## Контекст

Sprint 020A показал, что текущая реализация operator workspace в Review Flow начала двигаться в сторону AF-style layout,
но semantic/cognitive model всё ещё остается ближе к:

- CRM dashboard;
- support workspace;
- generic moderation UI.

В результате:

- operator workspace визуально стал лучше;
- но operational cognition всё ещё не соответствует Assistant Flow.

Текущая задача НЕ является CSS polishing.
Текущая задача — semantic alignment с operational console architecture Assistant Flow.

---

## ОБЯЗАТЕЛЬНО ПЕРЕД НАЧАЛОМ

1. Внести полный текст данного prompt в session log.
2. Прочитать:

- docs/architecture/PROJECT_STATE.md
- docs/architecture/operational-console-ui-contract.md
- docs/architecture/operational_discipline_universal_ru.md

3. Изучить исходники Assistant Flow operational console.

Смотреть в первую очередь:

frontend/admin-ui/src/pages/
- RagPage.tsx
- LogsPage.tsx
- TextPage.tsx
- MemoryPage.tsx
- ImagesPage.tsx
- AudioPage.tsx

frontend/admin-ui/src/components/
- OperationalModalityBadge.tsx
- OperationalPipelineStageIcon.tsx

frontend/admin-ui/src/utils/
- operationalConsoleUi.ts

frontend/admin-ui/src/styles/ или globals.css
- mini-badge--af-*
- af-pipeline-stage-icon--*
- modality-ops-*
- logs-console
- logs-stage
- modality-ops-panels

---

## КРИТИЧЕСКИ ВАЖНО

Нужно понять:

Assistant Flow — это НЕ admin panel.

Assistant Flow — это:

AI operational execution console.

Сейчас Review Flow operator workspace:

- слишком похож на moderation CRM;
- недостаточно похож на operational telemetry console.

Нужно перейти от:

"карточка обращения"

к:

"execution/lifecycle operational workspace".

---

# ЧТО НУЖНО ПРОАНАЛИЗИРОВАТЬ

## 1. Cognitive model

Сравнить:

Assistant Flow
vs
Review Flow Operator Workspace.

Описать:

- что сейчас semantic mismatch;
- что сейчас воспринимается как CRUD/CRM;
- какие блоки не являются operational-first;
- где operator scanning flow нарушен;
- где telemetry hierarchy отсутствует.

---

## 2. Operator eye-flow

Проанализировать:

Как оператор читает экран.

Сейчас operator workspace перегружен длинной линейной формой.

Нужно определить:

- где primary focus;
- где secondary focus;
- что operator должен видеть первым;
- что должно быть collapsed/secondary;
- что должно быть telemetry-only;
- что должно быть operational action layer.

Сравнить с AF Logs/RAG.

---

## 3. Timeline semantics

Сейчас timeline:

- выглядит как history block;
- но не как execution trace.

Нужно изучить:

- AF Logs timeline;
- AF RAG timeline;
- pipeline semantics;
- lifecycle grouping;
- stage density;
- operational status hierarchy.

И определить:

как должен выглядеть operator lifecycle timeline.

---

## 4. Workspace semantics

Проанализировать:

Текущий Workspace справа.

Сейчас:

- блоки выглядят как form sections;
- а не как operational telemetry groups.

Нужно определить:

какие блоки:

- primary operational blocks;
- telemetry blocks;
- lifecycle blocks;
- moderation blocks;
- editable blocks;
- publication blocks.

---

## 5. AI vs Human separation

AF очень жестко разделяет:

- system-generated;
- operator-generated;
- published/public.

Сейчас Review Flow делает это недостаточно явно.

Нужно определить:

как визуально и структурно разделить:

- AI Draft;
- Operator Revision;
- Published/Public Response;
- moderation state.

---

## 6. Density model

AF использует:

- dense operational scanning;
- compact telemetry;
- structured hierarchy.

Review Flow всё ещё содержит:

- слишком много воздуха;
- слишком длинные linear sections;
- CRM-like spacing.

Нужно определить:

какие области должны стать:

- плотнее;
- компактнее;
- более telemetry-oriented.

---

## 7. Bounded implementation plan

После анализа:

НЕ выполнять сразу полный rewrite.

Вместо этого:

сформировать bounded implementation plan.

Разбить дальнейшую работу на bounded phases.

Например:

- Phase C1 — Timeline semantics
- Phase C2 — Workspace telemetry grouping
- Phase C3 — AI/Human/Public separation
- Phase C4 — Operator action layer
- Phase C5 — Density normalization

Это пример.

Сформируй собственный план.

---

# ЧЕГО ДЕЛАТЬ НЕ НУЖНО

НЕ:

- переписывать всё сразу;
- делать redesign ради redesign;
- делать generic admin UI;
- делать CRM dashboard;
- делать modal-first UX;
- делать form-centric layout.

Нужно:

- operational-first;
- lifecycle-first;
- telemetry-first;
- execution-trace-oriented UX.

---

# РЕЗУЛЬТАТ

В отчете обязательно:

1. Semantic gap analysis.
2. Cognitive mismatch list.
3. Что именно отличает AF operational console.
4. Что именно сейчас нарушено в Review Flow.
5. Предлагаемая operational hierarchy.
6. Предлагаемый operator eye-flow.
7. Предлагаемая lifecycle model.
8. Bounded implementation roadmap.
9. Какие изменения нужно внести в PROJECT_STATE.
10. Какие изменения нужно внести в operational UI contract.

---

# ВАЖНО

Это НЕ coding sprint.

Это:

operational semantics calibration sprint.

Нужно сначала научиться мыслить:

AI operational console architecture.

И только после этого продолжать implementation.
```

---

## 1. Inputs reviewed (required)

- `docs/architecture/PROJECT_STATE.md` (section: UI / Operational Console Standards)
- `docs/architecture/operational-console-ui-contract.md`
- `docs/architecture/operational_discipline_universal_ru.md` (missing originally; created as a pointer to canonical discipline doc)
- Also referenced for cross-sprint continuity:
  - `docs/architecture/operator_workspace_operational_ui_alignment.md`
  - `docs/architecture/operational_discipline_assistant_flow_ru.md`

Constraint note:
- The prompt requests reading Assistant Flow source files under `frontend/admin-ui/...`. Those paths are not present in this repository; therefore, this pass uses the already-vendored AF contract docs and existing Review Flow alignment docs as the source of truth.

---

## 2. Semantic gap analysis (Review Flow vs AF)

### 2.1 What makes AF an operational console (not admin CRUD)

- **Primary object** is an execution/lifecycle (trace), not a record to edit.
- **Muscle-memory layout**: stable left stream controls and stable right workspace.
- **Status-first**: state and outcome are always visible; actions are lifecycle-contextual.
- **Trace-first timeline**: stage line contract + dense scan; details secondary/collapsible.
- **Hard separation of authorship layers**: system → human → public.

### 2.2 Current Review Flow cognitive mismatches (CRM gravity)

- **Form-section feel** in detail panel: blocks can read like “edit sections” instead of “telemetry groups”.
- **Timeline as history**: risks becoming “audit log at bottom” instead of a trace contract driving cognition.
- **Primary/secondary focus ambiguity**: without explicit hierarchy, operator scanning is slower and action clarity drops.
- **Over-weighted raw payload** risk: when debug data is not clearly secondary, it competes with primary artifacts.

---

## 3. Operator eye-flow (target)

### Primary focus (first glance)

1) Identity + lifecycle state (id, moderation/publication, priority)  
2) Expected next action (approve / reject / request revision / publish)  
3) Authorship layers (AI draft vs operator revision vs published)  

### Secondary focus

- Classification summary: scenario/sentiment/topic/priority (+ source/confidence)
- Template/phrase hints

### Telemetry-only / collapsible

- Raw JSON payloads
- Long technical metadata

---

## 4. Timeline semantics (execution trace contract)

Target: timeline is treated as an execution trace, not “history”.

Contract:
- stage header line: time + label + status (+ latency/delta when available)
- details expandable, left-aligned, not repeated via grey duplicate lines
- “current” stage highlighted; completed/failed encoded consistently

Review Flow canonical stages (bounded to existing data):
1) Review received  
2) Classification completed  
3) Template selected  
4) AI draft generated  
5) Handed to operator  
6) Operator edited  
7) Moderation outcome  
8) Published  

---

## 5. Workspace block taxonomy (right panel)

Required semantic grouping:
- **Primary operational blocks**: identity/status, customer request, response pipeline
- **Telemetry blocks**: compact KV + pills; confidence/hints
- **Lifecycle blocks**: timeline + event chain
- **Moderation blocks**: decision + reason (internal)
- **Editable blocks**: operator revision only (separate)
- **Publication blocks**: customer-visible final response

---

## 6. AI vs Human vs Public separation (required)

Non-negotiable layers:
- AI Draft (system-generated)
- Operator Revision (human-editable)
- Published/Public (customer-visible)

Each layer requires explicit label and distinct surface.

---

## 7. Density model (what to densify, what to collapse)

- Make dense: list rows, top telemetry, lifecycle state, primary artifacts.
- Collapse/demote: raw payloads, verbose metadata, long debug traces that are not needed for the immediate decision.

---

## 8. Bounded implementation roadmap (post-calibration)

This sprint is calibration-only; follow-up work should be phased:

- **C1 — Timeline contract hardening** (operator + logs)
- **C2 — Telemetry grouping** (top-of-detail hierarchy)
- **C3 — AI/Human/Public enforcement** (all applicable pages)
- **C4 — Lifecycle-contextual action layer**
- **C5 — Density normalization** (remove leftover CRM whitespace patterns)

---

## 9. Doc changes required by prompt (completed)

### 9.1 PROJECT_STATE.md

- Added a compact “cross-project portability note” under **UI / Operational Console Standards** linking to Review Flow semantics calibration doc.

### 9.2 operational UI contract

- Updated `docs/architecture/operational-console-ui-contract.md` with a **Review Flow addendum**:
  - what is adopted as invariants
  - AF → Review Flow mapping (session/execution → review/work-item)
  - NL-style visual constraint

### 9.3 operational discipline universal

- Added `docs/architecture/operational_discipline_universal_ru.md` as a pointer to the canonical discipline doc in this repository.

### 9.4 New semantics doc

- Added `docs/architecture/review_flow_af_operational_semantics_alignment.md` as the main artifact for this sprint.

---

## 10. Output summary (what to do next)

Proceed with implementation only via bounded phases C1–C5, starting with timeline contract hardening (C1), and keep “execution-trace-first” as the primary operator cognition driver.

