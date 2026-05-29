# 2026-05-28 — Sprint 020 Phase 1: Operational Shell Foundation

## Full original prompt

Source: `cursor_tasks_local/2026-05-28_sprint_020_phase1_operational_shell_foundation.md`

---

# Sprint 020 Phase 1 — Operational Shell Foundation

## Контекст

Проект: Review Flow / Northline Market.

Текущая стадия:

* customer-facing contour стабилизирован;
* operational discipline formalized;
* PROJECT_SOT / IMPLEMENTATION_PLAN synchronized;
* Sprint 020 Phase 0 bootstrap завершён;
* Sprint 020A AF Operational UI Reference Alignment завершён.

Reference alignment уже зафиксировал:

* target operational architecture;
* AF-style operational semantics;
* NL-style visual language;
* operator workflow structure;
* shell-first implementation philosophy;
* UI invariants;
* forbidden patterns.

Теперь начинается первый bounded implementation sprint
по operational workspace foundation.

---

# Главная цель sprint phase

Создать:

```text
Operational Shell Foundation
```

для company/operator/admin workspace.

Это НЕ redesign всех экранов.

Это:

* foundation layer;
* shared operational infrastructure;
* reusable layout primitives;
* unified shell architecture.

---

# Важнейший implementation principle

НЕ:

```text
page-by-page redesign
```

А:

```text
shell-first operational platform evolution
```

---

# Обязательное чтение перед implementation

Cursor обязан внимательно изучить:

1. PROJECT_SOT
2. IMPLEMENTATION_PLAN
3. `docs/architecture/operator_workspace_operational_ui_alignment.md`
4. `docs/architecture/operational_discipline_assistant_flow_ru.md`
5. Session logs:

   * Sprint 019
   * Sprint 020 bootstrap
   * Sprint 020A alignment

Особенно:

* UI invariants;
* forbidden patterns;
* shell-first philosophy;
* NL-style adaptation;
* role-aware workspace semantics.

---

# Важнейшие ограничения

## Категорически запрещено

* redesign customer-facing contour;
* ломать existing business logic;
* массово переписывать pages;
* внедрять новый design system;
* внедрять dark AF palette;
* делать giant CSS rewrite;
* делать “улучшения всего сразу”;
* хаотично менять spacing across app;
* делать generic SaaS dashboard.

## Разрешено

* создавать shared operational primitives;
* вводить unified shell;
* создавать reusable layout abstractions;
* стабилизировать operational hierarchy;
* улучшать operator console structure;
* вводить bounded styling layer.

---

# Часть 1 — Unified company shell
... (prompt continues; see task file) ...

---

## Documents studied

- PROJECT_SOT: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- `IMPLEMENTATION_PLAN.md`
- Alignment spec: `docs/architecture/operator_workspace_operational_ui_alignment.md`
- Operational discipline: `docs/architecture/operational_discipline_assistant_flow_ru.md`
- Phase 0 session log: `docs/cursor_sessions/2026-05-28_sprint_020_phase0_operational_workspace_bootstrap.md`
- Sprint 020A alignment session log: `docs/cursor_sessions/2026-05-28_sprint_020A_af_operational_ui_reference_alignment.md`
- Sprint 019 operator stabilization (invariant preservation): `docs/cursor_sessions/2026-05-28_cursor_task_019_operator_console_data_fetch_repair.md`

---

## Created primitives (foundation layer)

All primitives are **NL-style** and scoped under the `op-*` class prefix to avoid styling drift and minimize impact on the client contour.

### Styling boundary

- `frontend/src/ops/ops.css`
  - NL-style tokens for operational surfaces
  - `op-*` prefixed classes for shell + primitives
- `frontend/src/main.jsx`
  - imports `./ops/ops.css` (additive; no removal of existing styles)

### Shell + navigation model

- `frontend/src/ops/nav/companyNavModel.js`
  - data-driven nav groups per role (operator/admin)
- `frontend/src/layouts/CompanyLayout.jsx`
  - migrated to `op-shell` / `op-sidebar` / `op-nav-*` classes
  - keeps role-aware single workspace invariant (operator/admin inside one shell)

### Page chrome

- `frontend/src/ops/components/OpPage.jsx`
  - `OpPage` (predictable container)
  - `OpPageHeader` (title/subtitle/actions region)

### Toolbar

- `frontend/src/ops/components/OpToolbar.jsx`
  - `OpToolbar`, `OpInput`, `OpSelect`, `OpTextarea`, `OpButton`

### Split layout foundation

- `frontend/src/ops/components/OpSplitView.jsx`
  - stable list/detail layout with responsive collapse rules from CSS

### Operational card pattern

- `frontend/src/ops/components/OpCard.jsx`
  - compact “operational card” list item with primary/secondary/preview + pills

### Unified status system (badges/pills)

- `frontend/src/ops/components/OpPill.jsx`
  - `OpPill`, `OpPillRow`
  - semantic color mapping functions:
    - `moderationPillColor`
    - `publicationPillColor`
    - `priorityPillColor`

### Metadata rows

- `frontend/src/ops/components/OpMetadata.jsx`
  - `OpMetadataGrid`, `OpMetadataList` (compact key/value rows)

### Timeline primitive

- `frontend/src/ops/components/OpTimeline.jsx`
  - vertical timeline list with status markers (done/failed/current semantics as a foundation)

---

## Shell architecture decisions

- Keep **one company workspace shell** for both operator and administrator.
- Use **data-driven nav model** (`getCompanyNavGroups(role)`) to ensure predictable grouping and role-aware capabilities.
- Shell visuals stay **calm NL-style** (light operational content surfaces; no AF-dark transfer).

---

## Sidebar/navigation decisions

- Sidebar grouping follows alignment doc and task requirements:
  - operator: queue now, placeholders for assigned/history later without backend coupling
  - admin: observability, quality, KB, settings
- Active indicator uses router `NavLink` state.

---

## Styling decisions

- Introduced bounded styling layer `ops.css` with `op-*` prefix.
- No global CSS rewrite performed; changes are additive and scoped.
- Avoided dark terminal aesthetics and neon highlights.

---

## Operator migration decisions (partial)

Page `/operator/reviews` was **partially migrated** to use new shell primitives without changing backend contracts:

- moved to `OpPage`, `OpPageHeader`, `OpToolbar`, `OpSplitView`
- queue list uses `OpCardButton` + pills (moderation/publication/priority always visible)
- detail workspace reorganized into semantic blocks:
  - header metadata
  - customer request block
  - classification/analysis block
  - response processing (AI Draft / Operator Revision / Published)
  - timeline/events (foundation view based on existing operational logs)

Invariant preserved:
- loading/error/empty/loaded states remain distinct (Sprint 019 requirement).

---

## Verification

- `frontend` build:

```bash
cd frontend
npm install
npm run build
```

Result: `vite build` succeeded.

---

## Risks / issues

- Global `frontend/src/index.css` still contains legacy company styles; new primitives are scoped but coexist. Future work should gradually migrate company pages to `op-*` primitives to reduce coupling.
- Timeline in operator detail currently uses existing `operational_logs` list; full pipeline-stage timeline mapping is a future phase (should remain bounded).

---

## Remaining future phases (not implemented here)

- Analytics + logs observability layer normalization
- Prompt + evaluation workspace evolution
- Knowledge base workspace normalization
- deeper operator workflow evolution (assignment, archive, richer lifecycle timeline)

