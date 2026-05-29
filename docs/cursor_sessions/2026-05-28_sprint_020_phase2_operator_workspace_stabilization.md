# 2026-05-28 — Sprint 020 Phase 2: Operator workspace stabilization

## Full original prompt

Source: `cursor_tasks_local/2026-05-28_sprint_020_phase2_operator_workspace_stabilization.md`

---

# Sprint 020 Phase 2 — Operator Workspace Stabilization

## Контекст

Проект: Review Flow / Northline Market.

Предыдущие этапы:

* customer-facing contour stabilized;
* PROJECT_SOT / IMPLEMENTATION_PLAN synchronized;
* operational discipline formalized;
* Sprint 020 bootstrap completed;
* Sprint 020A AF operational reference alignment completed;
* Sprint 020 Phase 1 operational shell foundation completed.

Phase 1 уже создал:

* unified company shell;
* shared operational primitives;
* `op-*` styling layer;
* split-layout foundation;
* reusable cards/toolbars/pills/timeline primitives;
* partial operator migration.

Теперь требуется:

```text
полноценная stabilization/migration
operator workspace
```

поверх новых operational primitives.

---

## Queue/list decisions

### Toolbar refinement (without backend contract changes)

Backend list endpoint supports only `moderation_status` and `publication_status`. Phase 2 keeps contracts intact and implements additional refinement **client-side**:

- search (id / customer / preview / metadata)
- priority filter
- scenario filter
- sentiment filter
- existing moderation filter
- refresh button (reuses `loadList()`)

Toolbar remains compact and sticky (via `OpToolbar`).

### Queue item structure (dense operational work-item)

Queue items now carry:

- primary: request id (fallback to `review_id`) + created timestamp
- semantic: customer + scenario/sentiment/priority + moderation state
- preview: short request excerpt
- operational indicators (pills):
  - moderation status
  - publication status
  - priority
  - AI draft state (derived, since list contract does not contain draft text)

Invariant preserved:
- loading/error/empty/loaded states remain distinct.

---

## Detail workspace decisions (semantic blocks)

Detail workspace is structured as:

1) Header metadata (request/customer/case/rating) + contextual quick actions  
2) Customer request block (original text, customer-visible)  
3) Classification / analysis block (compact metadata, no raw JSON as primary UX)  
4) Response processing pipeline (split into three layers)  
5) Lifecycle timeline (first-class stages)  
6) Internal notes / moderation reasons (derived from operational logs, internal-only)

---

## Response pipeline decisions

Strict separation enforced:

- **AI Draft** (read-only, source layer)
- **Operator Revision** (editable, local draft supported)
- **Published/Public response** (what customer sees; shown only if `published`)

Added bounded “Save draft” behavior without backend changes:
- localStorage key `review-flow-operator-draft:<review_id>`
- load prefers local draft → final_response → draft_response
- clear local draft supported

---

## Timeline decisions

Timeline is converted from “raw event list” into lifecycle stages with semantics:

- Review received
- Classification completed
- Template selected
- AI draft generated
- Handed to operator
- Operator edited
- Moderation outcome
- Published

Stage status is derived from existing `operational_logs` and `moderation_status` / `publication_status`.

---

## Styling decisions

- Uses NL-style operational primitives from `frontend/src/ops/ops.css`.
- Added timeline “current” state styling (`op-timeline-item--current`) without introducing dark palette.

---

## Risks / issues

- AI draft state in queue is **derived**, because list endpoint does not expose draft existence. This is a conscious contract-preserving trade-off.
- Additional server-side search/filtering is out of scope (would require backend contract changes).

---

## Changed files

- `frontend/src/pages/OperatorReviewsPage.jsx`
- `frontend/src/ops/components/OpTimeline.jsx`
- `frontend/src/ops/ops.css`

---

## Verification

```bash
cd frontend
npm run build
```

Result: build succeeded.

---

## Remaining future phases

- Analytics/Logs observability layer (Phase 3)
- Prompt/Evaluation workspace evolution
- Knowledge Base normalization

# 2026-05-28_sprint_020_phase2_operator_workspace_stabilization.md

# Sprint 020 Phase 2 — Operator Workspace Stabilization

## Контекст

Проект: Review Flow / Northline Market.

Предыдущие этапы:

* customer-facing contour stabilized;
* PROJECT_SOT / IMPLEMENTATION_PLAN synchronized;
* operational discipline formalized;
* Sprint 020 bootstrap completed;
* Sprint 020A AF operational reference alignment completed;
* Sprint 020 Phase 1 operational shell foundation completed.

Phase 1 уже создал:

* unified company shell;
* shared operational primitives;
* `op-*` styling layer;
* split-layout foundation;
* reusable cards/toolbars/pills/timeline primitives;
* partial operator migration.

Теперь требуется:

```text
полноценная stabilization/migration
operator workspace
```

поверх новых operational primitives.

---

# Главная цель sprint phase

Преобразовать:

```text
/operator/reviews
```

из:

* partially migrated admin screen

в:

* полноценную AF-style human-in-the-loop operational workspace.

---

# Ключевая implementation philosophy

НЕ:

```text
CRUD moderation page
```

А:

```text
operational execution workspace
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
   * Sprint 020 Phase 1 foundation

Особенно:

* UI invariants;
* lifecycle-first semantics;
* human-in-the-loop workflow;
* response pipeline model;
* forbidden patterns.

---

# Важнейшие ограничения

---

## Категорически запрещено

* ломать backend contracts;
* менять customer-facing contour;
* делать broad architecture rewrite;
* вводить новый design system;
* делать AF dark theme;
* делать giant feature expansion;
* делать analytics/logs redesign;
* трогать unrelated admin pages;
* превращать workspace в generic CRM table.

---

## Разрешено

* глубокая stabilization operator workspace;
* migration на operational primitives;
* restructuring detail workspace;
* lifecycle/timeline UX improvements;
* response pipeline UX;
* metadata hierarchy improvements;
* queue density improvements;
* toolbar normalization.

---

# Главная architectural задача

Построить:

```text
human-in-the-loop operational review console
```

где оператор:

* видит lifecycle;
* понимает pipeline;
* различает AI vs human layers;
* быстро обрабатывает queue;
* работает в operational rhythm.

---

# Часть 1 — Queue/List panel refinement

Использовать:

* `OpCard`
* `OpSplitView`
* `OpPill`
* toolbar primitives

как foundation.

---

# Queue/list panel должна стать

НЕ:

```text
списком отзывов
```

А:

```text
operational work-item stream
```

---

## Required queue structure

Каждый item обязан содержать:

### Primary row

* review/request id;
* customer name;
* created timestamp.

---

### Semantic row

* topic/scenario;
* sentiment;
* priority;
* moderation state.

---

### Preview row

* short request preview;
* no giant text blocks.

---

### Operational indicators

* AI draft state;
* publication state;
* assigned operator (если доступно);
* escalation state (если доступно).

---

### Visual semantics

* selected item highlight;
* compact spacing;
* dense hierarchy;
* quick scanning capability.

---

# Toolbar refinement

Toolbar обязана поддерживать:

* search;
* moderation filter;
* priority filter;
* topic/scenario filter;
* refresh;
* compact operational density.

---

## Important invariant

Toolbar должна быть:

* compact;
* operational;
* sticky where appropriate.

НЕ giant filter form.

---

# Часть 2 — Detail workspace restructuring

Это главный focus sprint.

---

# Detail workspace должен стать

НЕ:

```text
редактированием записи
```

А:

```text
операционным lifecycle workspace
```

---

# Обязательная структура detail workspace

---

## 1. Review header

Header обязан содержать:

* request id;
* customer;
* status;
* priority;
* assigned operator;
* created/updated timestamps;
* publication state;
* quick operational actions.

---

## Quick actions

Допустимые actions:

* approve;
* reject;
* needs revision;
* save draft;
* publish;
* refresh.

---

## Important invariant

Actions должны:

* соответствовать lifecycle semantics;
* быть contextual;
* не выглядеть random button collection.

---

# 2. Customer request block

Это adaptation блока:

```text
Что спросил пользователь
```

---

## Обязательные элементы

* original request/review;
* customer-visible wording;
* rating;
* topic/category;
* source channel;
* order/service identifiers;
* attachments placeholder if relevant.

---

## Technical metadata

Technical metadata должна быть:

* secondary;
* compact;
* visually separated.

Например:

* IP;
* user agent;
* locale;
* timestamps.

---

# 3. Classification / analysis block

Использовать compact metadata hierarchy.

---

## Показывать

* sentiment;
* priority;
* scenario;
* classification source;
* phrase match;
* confidence;
* selected template;
* AI provider/model.

---

## Important invariant

Не показывать giant raw JSON blocks
как primary UX.

Debug data:

* collapsible;
* secondary.

---

# 4. Response processing pipeline

КРИТИЧЕСКИ ВАЖНО.

---

# Запрещено

Смешивать:

* AI draft;
* operator response;
* published response

в один textarea block.

---

# Необходимо разделить

---

## AI Draft section

Показывать:

* generated draft;
* provider/model;
* generation timestamp;
* confidence/fallback;
* template source if available.

---

## Operator Revision section

Показывать:

* editable operator response;
* editor/operator;
* modification timestamp;
* moderation state.

---

## Published/Public Response section

Показывать:

* final published response;
* publication state;
* publication timestamp;
* visibility state.

---

# Important invariant

Operator обязан ясно понимать:

* что сгенерировала AI;
* что изменил человек;
* что увидит клиент.

---

# 5. Pipeline timeline

Timeline должен стать:

```text
first-class operational object
```

---

# Использовать primitive из Phase 1

Но:

* значительно улучшить semantics;
* добавить lifecycle visibility.

---

## Timeline stages

Пример:

1. Review received
2. Classification completed
3. Template selected
4. AI draft generated
5. Escalation triggered
6. Assigned to operator
7. Operator edited
8. Moderation
9. Approved/rejected
10. Published

---

## Timeline behavior

* vertical structure;
* current stage highlight;
* completed stages;
* failed stages;
* timestamps;
* compact event metadata.

---

# 6. Internal notes / operational comments

Создать clear separation:

* customer-visible data;
* internal operational data.

---

## Internal section может содержать

* operator notes;
* moderation comments;
* escalation notes;
* rejection reason;
* revision notes.

---

# Часть 3 — Visual stabilization

---

# Использовать

* NL-style surfaces;
* calm spacing;
* restrained accents;
* compact operational density;
* clean metadata hierarchy.

---

# НЕ использовать

* dark AF palette;
* cyberpunk styling;
* giant cards;
* giant whitespace;
* oversized typography;
* marketing-dashboard aesthetics.

---

# Часть 4 — Operational density refinement

Очень важно.

---

# Workspace должен стать

НЕ:

```text
визуально тяжёлым
```

Но:

```text
information-dense operationally
```

---

## Нужно улучшить

* metadata rhythm;
* spacing consistency;
* compact hierarchy;
* scanability;
* split-panel balance.

---

# Часть 5 — Forbidden patterns

---

## Категорически запрещено

* CRUD-table mentality;
* centered edit forms;
* random action buttons;
* weak hierarchy;
* giant text blocks;
* timeline hidden below fold;
* mixing internal/customer semantics;
* uncontrolled CSS overrides;
* giant modals replacing workspace;
* page-specific hacks.

---

# Часть 6 — Acceptance criteria

Sprint считается завершённым только если:

1. `/operator/reviews` выглядит как operational workspace, а не CRUD page.
2. Queue supports fast operational scanning.
3. Detail workspace разделён на semantic operational blocks.
4. Response pipeline clearly separated.
5. Timeline visible and operationally meaningful.
6. AI vs human vs published layers clearly visible.
7. Metadata hierarchy stabilized.
8. Toolbar normalized.
9. NL-style visual language preserved.
10. Customer-facing contour unaffected.
11. Backend contracts preserved.
12. No uncontrolled redesign outside operator workspace.

---

# Часть 7 — Deliverables

---

## 1. Implementation

Bounded operator workspace stabilization.

---

## 2. Optional document updates

При необходимости:

* compact updates to PROJECT_SOT;
* compact updates to IMPLEMENTATION_PLAN.

НЕ делать giant rewrites.

---

## 3. Session log

Создать:

```text
docs/cursor_sessions/2026-05-28_sprint_020_phase2_operator_workspace_stabilization.md
```

Session log обязан содержать:

1. Full original prompt.
2. Queue/list decisions.
3. Detail workspace decisions.
4. Response pipeline decisions.
5. Timeline decisions.
6. Styling decisions.
7. Risks/issues.
8. Remaining future phases.

---

# Важное operational замечание

Это:

* bounded operator workspace sprint.

Следующие phases:

* Analytics/Logs observability layer;
* Prompt/Evaluation workspace;
* Knowledge Base normalization.

НЕ пытаться реализовать их сейчас.

Maintain strict scope discipline.
