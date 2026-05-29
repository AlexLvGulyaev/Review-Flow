# 2026-05-28 — Sprint 020 Phase 0: Operational workspace bootstrap

## Full original prompt text

Source: `cursor_tasks_local/sprint_020_phase0_operational_workspace_bootstrap.md`

---

# Cursor Sprint 020 — Company/Admin Workspace Stabilization

# Phase 0 — Orientation / Bootstrap / Operational UI Forensics

## Контекст

Проект Review Flow завершил:

* initial implementation phase;
* customer-facing stabilization phase;
* operator data-fetch stabilization.

В настоящее время проект переходит
в новую architectural phase:

```text id="a0o2o5"
from:
MVP-like isolated admin screens

to:
unified operational workspace platform
```

---

# Главная задача текущего sprint phase

Это НЕ coding sprint.

Это:

* orientation sprint;
* architectural bootstrap;
* operational UI forensic analysis;
* bounded implementation planning phase.

---

# Важнейшее ограничение

Запрещено:

* начинать UI rewrite;
* делать refactor;
* менять layout;
* писать новый shell;
* улучшать отдельные страницы;
* делать “быстрые визуальные фиксы”.

Сейчас требуется:

* analysis;
* decomposition;
* implementation planning;
* dependency mapping.

---

# Главная проблема текущего состояния

Current company/admin workspace:

* technically functional;
* operationally immature;
* visually fragmented;
* architecturally inconsistent.

Сейчас:

* каждая страница живёт отдельно;
* нет unified shell;
* нет operational hierarchy;
* нет shared layout primitives;
* нет consistent spacing/typography;
* operator/admin UI визуально не принадлежат одной системе;
* analytics/logs/evaluation/prompts выглядят как isolated CRUD/admin forms.

---

# Target operational direction

Target direction уже определён в:

* PROJECT_SOT;
* implementation documents;
* reference contour expectations.

Целевой язык интерфейса:

```text id="a9l26y"
AF-style operational workspace
```

Характеристики:

* dense operational UI;
* unified shell;
* dashboard-first hierarchy;
* operational observability feel;
* role-aware workspace;
* compact information density;
* reusable layout primitives;
* production SaaS feeling.

---

# Главная цель bootstrap phase

Подготовить:

* bounded implementation strategy;
* migration sequence;
* dependency order;
* subsystem decomposition;
* reusable UI primitives strategy.

---

# Обязательное чтение перед анализом

Cursor ОБЯЗАН:
не поверхностно просмотреть,
а внимательно изучить:

---

## 1. PROJECT_SOT

Текущий canonical PROJECT_SOT проекта.

Особенно:

* contour separation;
* company workspace philosophy;
* operational semantics;
* role model;
* UI direction;
* operational discipline references.

---

## 2. IMPLEMENTATION_PLAN

Особенно:

* completed sprint history;
* current sprint;
* roadmap evolution;
* operational workspace direction.

---

## 3. Operational discipline

Документ:

```text id="2ty4tx"
docs/architecture/operational_discipline_assistant_flow_ru.md
```

Особенно:

* PROJECT_SOT model;
* implementation responsibility model;
* sprint workflow;
* bounded execution principles.

---

## 4. Session logs

Обязательно изучить session logs:

* sprint 017;
* sprint 018;
* sprint 019;
* sprint 020A;
* sprint 020B.

Особенно:

* customer-facing stabilization;
* operational contour evolution;
* prompt protocol evolution;
* PROJECT_SOT evolution.

---

# Главная аналитическая задача

Провести forensic comparison между:

```text id="9j7fdm"
target operational expectations
vs
current operational reality
```

---

# Нужно проанализировать

---

## 1. Shell architecture

Текущие проблемы:

* fragmented navigation;
* inconsistent spacing;
* isolated layouts;
* duplicated structural patterns;
* missing hierarchy.

Нужно определить:

* как должен выглядеть unified operational shell;
* какие layout primitives нужны;
* какие reusable abstractions нужны;
* какие zones/layout regions должны существовать.

---

## 2. Role model

Важно:

Operator и Administrator НЕ должны быть:

* двумя разными UI systems.

Должен существовать:

* единый workspace shell;
* единая operational philosophy;
* разные capability trees.

Нужно определить:

* где shared UI;
* где role-specific UI;
* как должна выглядеть role-aware navigation hierarchy.

---

## 3. Information hierarchy

Проанализировать:

* analytics;
* logs;
* prompts;
* evaluation;
* knowledge base sections;
* operator queue.

Определить:

* где excessive whitespace;
* где missing density;
* где wrong hierarchy;
* где form-first instead of workflow-first;
* где CRUD-thinking вместо operational workspace.

---

## 4. Shared UI primitives

Нужно определить список reusable primitives:

Например:

* page container;
* operational page header;
* filter toolbar;
* metrics cards;
* split panel;
* operational table;
* sidebar section;
* detail panel;
* event card;
* form section card;
* compact metadata block;
* status badges;
* diagnostics sections.

---

## 5. Migration dependency order

Очень важно.

Нельзя:

* случайно переписывать страницы.

Нужно определить:

* правильный implementation order;
* subsystem dependencies;
* what must be built first.

---

# Ожидаемая implementation philosophy

НЕ:

```text id="o2ajgn"
page-by-page redesign
```

А:

```text id="s4ttaj"
shell-first operational platform evolution
```

---

# Ожидаемый результат bootstrap phase

Cursor должен подготовить bounded implementation plan.

---

# План обязан содержать

---

## 1. Current state assessment

Краткий forensic analysis:

* сильные стороны;
* architectural weaknesses;
* operational UX weaknesses;
* layout inconsistencies;
* hierarchy problems.

---

## 2. Target operational architecture

Описание:

* unified shell;
* navigation hierarchy;
* role-aware workspace;
* operational density;
* reusable layout primitives.

---

## 3. Recommended implementation sequence

С explicit dependency order.

Ожидаемый direction примерно:

### Phase 1

Operational shell foundation

### Phase 2

Operator workspace refactor

### Phase 3

Analytics + logs observability layer

### Phase 4

Knowledge base workspace normalization

### Phase 5

Prompt + evaluation workspace evolution

Но Cursor должен:

* проверить;
* уточнить;
* при необходимости скорректировать.

---

## 4. Reusable primitives strategy

Нужен список:

* reusable components;
* shared layouts;
* shared patterns;
* operational UI abstractions.

---

## 5. Migration risks

Определить:

* high-risk rewrites;
* dangerous coupling;
* duplicated logic;
* CSS/layout instability risks;
* navigation risks.

---

# Важнейшее ограничение sprint phase

Это:

* orientation;
* analysis;
* planning.

НЕ implementation sprint.

---

# Acceptance criteria

Phase считается завершённой только если:

1. Cursor изучил:

   * PROJECT_SOT;
   * IMPLEMENTATION_PLAN;
   * operational discipline;
   * relevant session logs.

2. Проведён forensic comparison:

   * target expectations;
   * current reality.

3. Подготовлен bounded implementation plan.

4. Определён:

   * dependency order;
   * migration strategy;
   * reusable primitives strategy.

5. Выделены:

   * shell layer;
   * shared abstractions;
   * subsystem boundaries.

6. Cursor НЕ начал uncontrolled implementation/refactor.

---

# Session log requirements

Создать session log:

```text id="uj90eu"
docs/cursor_sessions/2026-05-28_sprint_020_phase0_operational_workspace_bootstrap.md
```

Session log обязан содержать:

1. Full original prompt text.
2. Какие документы изучены.
3. Current-state assessment.
4. Target operational direction.
5. Recommended implementation phases.
6. Shared primitives strategy.
7. Risks and dependencies.
8. Final bounded implementation plan.

---

# Важное operational замечание

Это НЕ:

* “сделай красиво”;
* “обнови админку”;
* “улучши UI”.

Это:

* operational workspace architecture bootstrap;
* platform UI evolution planning;
* shell-first transformation planning.

Maintain strict scope discipline.

---

## Documents studied (paths)

### Canonical artifacts

- **PROJECT_SOT**: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- **IMPLEMENTATION_PLAN**: `IMPLEMENTATION_PLAN.md`
- **Operational discipline**: `docs/architecture/operational_discipline_assistant_flow_ru.md`

### Relevant session logs (операционально релевантные)

- **Sprint 017–018 (customer-facing stabilization)**:
  - `docs/cursor_sessions/2026-05-27_cursor_task_017_homepage_pixel_reference_rebuild.md`
  - `docs/cursor_sessions/2026-05-27_cursor_task_018_review_creation_modal_flow.md`
  - `docs/cursor_sessions/2026-05-27_cursor_task_018B_status_dialog_and_review_id_normalization.md`
- **Sprint 019 (operator console stabilization)**: `docs/cursor_sessions/2026-05-28_cursor_task_019_operator_console_data_fetch_repair.md`
- **Sprint 020A / 020B**:
  - `docs/cursor_sessions/2026-05-28_cursor_task_020A_project_sot_binding.md`
  - `docs/cursor_sessions/2026-05-28_cursor_task_020B_sot_vs_implementation_responsibilities.md`

### Milestone logs (для понимания структуры company contour)

- Operator workflow baseline: `docs/cursor_sessions/2026-05-25_cursor_task_003_milestone3_operator_workflow.md`
- Prompt + evaluation foundation: `docs/cursor_sessions/2026-05-26_cursor_task_004_milestone4_prompt_management.md`
- Analytics + logs: `docs/cursor_sessions/2026-05-26_cursor_task_005_milestone5_analytics_observability.md`
- Admin KB + role separation: `docs/cursor_sessions/2026-05-26_cursor_task_006_milestone6_admin_knowledge_base.md`

---

## Current-state assessment (forensic)

### Strengths (what is already working)

- **Contour separation exists** at routing/layout level:
  - Client contour uses `frontend/src/layouts/ClientLayout.jsx`
  - Company contour uses `frontend/src/layouts/CompanyLayout.jsx`
- **Role model is explicit and enforced**:
  - `ProtectedRoute` checks role and redirects to `/access-denied`
  - Company sidebar navigation is role-aware (operator links vs admin groups)
- **Company contour has a real shell (minimal)**:
  - Sticky sidebar, grouped nav, consistent background
- **Operational surfaces exist and are functional** (at least structurally):
  - Operator queue: `/operator/reviews`
  - Admin: prompts `/prompts`, evaluation `/evaluation`, analytics `/analytics`, logs `/logs`, knowledge base `/admin/*`, AI providers settings
- **Centralized API helper exists** (`apiFetch`), already used consistently by operational pages.

### Architectural weaknesses

- **Global CSS monolith** (`frontend/src/index.css`) mixes:
  - generic primitives (`.page`, `.operator-layout`, `.metrics-grid`, etc.)
  - client contour design tokens and detailed styling
  - company contour styling
  This creates **high coupling and change risk** when evolving operational UI.
- **Page-level layout patterns are ad-hoc and duplicated**:
  - operator/admin pages reuse `.operator-layout` even where semantics differ (Prompts uses operator-style split list/detail, KB uses 3-column grid).
- **No explicit “operational primitives” layer**:
  - there is a shell (`CompanyLayout`), but there are no shared React layout primitives like `PageHeader`, `Toolbar`, `Panel`, `SplitView`, `DataTable`, etc.
- **Navigation hierarchy is shallow and route-centric**, not workflow-centric:
  - Operator sees only “queue”, Admin sees feature groups; there is no “workspace home / dashboard-first entry” with hierarchy and summary.

### Operational UX weaknesses (target vs reality)

- **Information density is inconsistent**:
  - Company shell suggests “dense ops”, but pages still use generic page spacing and form blocks from earlier milestones.
- **Workflow-first hierarchy is missing**:
  - Many pages present “CRUD first” (forms + lists) instead of “operational workflow surfaces” (overview → filters → work list → detail → actions).
- **Observability feel is partial**:
  - Logs page has timeline cards; analytics has metric cards; but there is no shared pattern language tying these together inside one operational system.

### Layout inconsistencies

- `.page` is max-width 640 by default, while many company pages use `page-wide` (1200).
- Operator queue uses a 2-column grid; KB uses 3 columns; prompts uses operator grid but then embeds a form that uses `.review-form` (client-ish).
- Typography/spacing in company contour is “ok” but not standardized into tokens/scales.

---

## Target operational direction (from SOT)

From `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`:

- **Company contour** is an internal operational workspace.
- Direction is **AF-style operational workspace**:
  - unified shell
  - dense information surfaces
  - role-aware navigation hierarchy (operator/admin are roles inside the same workspace)
  - “production SaaS feeling”

---

## Target operational architecture (proposed blueprint)

### 1) Unified operational shell (single company workspace)

**One shell** for both operator and administrator:

- **Left navigation**: grouped by “workspace areas”, gated by capabilities.
- **Top bar** (shared): workspace context (environment/project), global search (later), quick actions (later), role indicator.
- **Content frame**: consistent page padding, max widths, and scroll behavior.

### 2) Role-aware navigation hierarchy (capability tree)

Keep one nav tree, with role-gated nodes:

- **Operator**
  - Queue / Worklist (primary workflow surface)
  - (Future) queue metrics / SLA / escalation
- **Administrator**
  - Observability: Analytics, Logs
  - AI quality: Prompts, Evaluation
  - Knowledge base: Phrases, Templates, Scenarios, Sentiments
  - Settings: AI providers

Shared:
- Shell + page chrome
- Common tables/panels/toolbars/badges/metadata blocks

### 3) Zones / layout regions (needed for AF-style feel)

- **WorkspaceHome** (dashboard-first landing per role)
- **Worklist + detail** split view
- **Filters / query toolbar** area
- **Metrics strip** area (summary cards)
- **Diagnostics / events** area (timeline, last runs, errors)

---

## Recommended implementation sequence (explicit dependency order)

> Это “bounded plan”: описывает порядок и зависимости. Не является задачей на немедленный рефактор/переписывание.

### Phase 1 — Operational shell foundation (must be first)

Dependencies: none (foundation layer).

Deliverables:
- A stable **operational primitives layer** (React components + CSS scope strategy).
- A **layout contract** for company pages (page container, header, toolbar, panel).
- A **navigation hierarchy model** (data-driven groups + capability gating).

Non-goals:
- No page redesign “for beauty”.
- No rewrites of existing flows; only introduce foundation pieces.

### Phase 2 — Operator workspace evolution (workflow-first)

Dependencies: Phase 1 primitives + split-view pattern.

Deliverables:
- Operator queue re-expressed via shared primitives:
  - Worklist + detail panel
  - Standard header + toolbar
  - Standard status badges + compact metadata
  - Explicit state model: loading/error/empty/loaded (keep invariant from Sprint 019).

### Phase 3 — Observability surfaces normalization (analytics + logs)

Dependencies: Phase 1 primitives (cards, tables, timeline blocks).

Deliverables:
- Metrics strip + tables share components.
- Logs timeline uses shared “event card” patterns.
- Shared filter toolbar (event_type, review_id, time range later).

### Phase 4 — Knowledge base workspace normalization (admin KB)

Dependencies: Phase 1 primitives (3-column layout, forms).

Deliverables:
- Standard “list / edit / create” pattern in operational style:
  - standardized empty states
  - form sections as cards
  - consistent spacing/typography
- Potentially unify `AdminKbPage` into “OperationalCrudWorkspace” pattern (later; avoid early rewrite).

### Phase 5 — Prompt + evaluation workspace evolution

Dependencies: Phase 1 primitives + Phase 3 patterns (tables/events) optionally.

Deliverables:
- Prompt version list/detail is a good candidate for standardized split view.
- Evaluation can adopt a “runs / cases / results” hierarchy.

---

## Shared primitives strategy (initial list)

### Shell primitives

- `CompanyShell` (already exists as `CompanyLayout`, but should become a composable primitive)
- `CompanySidebar` / `NavGroup` / `NavItem`
- `RoleBadge` / `RoleSwitcher` (existing `RoleSelector` is functional baseline)

### Page chrome primitives

- `OpPage` / `OpPageContainer` (standard padding, width, scroll contract)
- `OpPageHeader` (title, subtitle, breadcrumbs, right-side actions)
- `OpToolbar` (filters, search input, primary/secondary actions)

### Layout primitives

- `SplitView` (worklist + detail)
- `Panel` / `Card` / `SectionCard`
- `Stack` / `Inline` (spacing primitives) — optional but helps avoid CSS drift

### Data display primitives

- `MetricsStrip` / `MetricCard`
- `DataTable` (existing `.data-table` styles are a proto)
- `Badge` variants: status / event_type / role / health
- `MetadataBlock` (compact key/value)
- `Timeline` / `EventCard` (for logs)

### Forms primitives (operational)

- `FormSectionCard`
- `Field` / `Textarea` / `Select` wrappers with consistent spacing and error display

---

## Migration risks & dependencies

### High-risk areas

- **CSS coupling risk**: `index.css` currently holds client + company + generic styles; naive edits can regress client contour.
- **Accidental page-by-page redesign**: tempting, but violates shell-first discipline.
- **Navigation regressions**: role gating is simple and route-based; shifting to a capability model must preserve security invariants.

### Dangerous coupling / duplication

- `.operator-layout` used as a generic split view across unrelated pages (operator queue vs prompts) → risk of “one CSS tweak breaks multiple workflows”.
- Shared class names (`.page`, `.review-form`) used in both contours → risk of cross-contour style bleed.

### Dependency order invariants

- Do not migrate pages until Phase 1 primitives exist; otherwise migration becomes ad-hoc and irreversible.
- Keep Sprint 019 invariant explicit:
  - request failure ≠ empty queue
  - loading/error/empty/loaded states must remain distinct.

---

## Final bounded implementation plan (what to do next, without starting now)

### Bounded objective

Evolve company contour from “isolated admin screens” to a **unified operational workspace platform** using **shell-first** strategy.

### Next concrete steps (for Phase 1 task prompt, future sprint)

- Define and implement:
  - operational design tokens (spacing/typography scale) for company contour only
  - `OpPage`, `OpPageHeader`, `OpToolbar`, `Panel/Card`, `SplitView`
  - navigation model as data (groups + links + required capability/role)
- Introduce CSS scoping boundary to reduce coupling:
  - company styles under `.company-*` namespace or a dedicated stylesheet imported by company layout.
- Add `CompanyHome` pages:
  - operator: “Queue summary + entry”
  - admin: “Observability summary + links”

### Explicit non-goals (enforced)

- No UI rewrite of existing pages.
- No refactor of backend or API routes.
- No changes to customer-facing layout/brand.
- No large CSS reformatting across the whole file.

