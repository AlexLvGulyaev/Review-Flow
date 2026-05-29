# 2026-05-28 — Sprint 020 Phase 3: Observability layer (Analytics + Logs)

## Full original prompt

Source: `cursor_tasks_local/2026-05-28_sprint_020_phase3_observability_layer.md`

---

# Sprint 020 Phase 3 — Analytics + Logs Observability Layer
... (prompt continues; see task file) ...

---

## Analytics decisions

### Objective

Transform analytics from “static dashboard” into **operational decision surface** integrated into the company shell.

### Implementation

- `/analytics` migrated to `op-*` primitives:
  - `OpPage` + `OpPageHeader`
  - compact metric cards (`OpMetricCard`)
  - bounded “operational signals” insights (`OpInsightCard`)
  - distributions remain compact and secondary (tables), not dominating the workspace
  - refresh action provided

### Notes

- No decorative chart frameworks added.
- No backend contract changes required.

---

## Logs workspace decisions

### Objective

Convert logs into a **structured operational event stream** with a detail workspace.

### Implementation (NL-style, AF semantics)

- `/logs` becomes split-workspace:
  - left: dense event stream list (scannable, compact)
  - right: event detail workspace (metadata → summary → structured payload → event chain)
- toolbar supports:
  - client-side search
  - API filters: `event_type`, `review_id`
  - refresh/apply
- severity is **derived** (bounded): based on message keywords + latency threshold; no new backend fields introduced
- event chain is supported as a **bounded window** over currently loaded events for the same `review_id`

### Payload handling

- `metadata` is shown as a structured block with a **collapsible raw payload** (`OpPayloadBlock`).
- avoids raw JSON wall by default (invariant preserved).

---

## Observability primitives decisions

Created reusable primitives under `frontend/src/ops/observability/`:

- `OpMetricCard`
- `OpInsightCard`
- `OpPayloadBlock`

All of them are styled via existing `op-*` CSS boundary (NL-style).

---

## Timeline / event-chain decisions

- Logs detail panel shows an event chain (bounded to loaded window) using `OpTimeline`.
- Timeline is presented as lifecycle thinking aid, not as unreadable blob.

---

## Styling decisions

- Uses existing NL-style operational primitives and `op-*` scoping.
- No AF dark palette introduced.

---

## Risks / issues

- Backend log schema does not expose severity/subsystem/operator fields. Filters and severity are therefore:
  - limited to existing API parameters
  - partially derived client-side
- Event chain is limited to the loaded window of logs (bounded, contract-preserving).

---

## Changed files

- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/pages/LogsPage.jsx`
- `frontend/src/ops/observability/OpMetricCard.jsx`
- `frontend/src/ops/observability/OpInsightCard.jsx`
- `frontend/src/ops/observability/OpPayloadBlock.jsx`
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

- Prompt/Evaluation workspace
- Knowledge Base normalization
- deeper admin tooling evolution

# Sprint 020 Phase 3 — Analytics + Logs Observability Layer

## Контекст

Проект: Review Flow / Northline Market.

Предыдущие этапы:

- customer-facing contour stabilized;
- operational discipline formalized;
- PROJECT_SOT / IMPLEMENTATION_PLAN synchronized;
- Sprint 020 bootstrap completed;
- Sprint 020A AF operational reference alignment completed;
- Sprint 020 Phase 1 operational shell foundation completed;
- Sprint 020 Phase 2 operator workspace stabilization completed.

Текущий company workspace уже имеет:
- unified shell;
- operational primitives;
- split-layout foundation;
- operator lifecycle workspace;
- timeline primitives;
- operational density model.

Следующий этап:
построение полноценного observability layer для administrator/company workspace.

---

# Главная цель sprint phase

Преобразовать:
- analytics pages;
- logs pages;
- observability-related sections

из:
- isolated admin screens;
- static dashboards;
- plain tables/forms;

в:
- unified operational observability workspace.

---

# Ключевая implementation philosophy

НЕ:

```text
“страница аналитики”
```

И НЕ:

```text
“таблица логов”
```

А:

```text
operational observability layer
```

---

# Главная архитектурная идея

Administrator должен:
- видеть состояние системы;
- видеть operational flows;
- видеть AI lifecycle;
- понимать проблемы;
- быстро расследовать инциденты;
- анализировать тенденции;
- понимать health operational contour.

---

# Обязательное чтение перед implementation

Cursor обязан внимательно изучить:

1. PROJECT_SOT
2. IMPLEMENTATION_PLAN
3. `docs/architecture/operator_workspace_operational_ui_alignment.md`
4. `docs/architecture/operational_discipline_assistant_flow_ru.md`
5. Session logs:
   - Sprint 020 bootstrap
   - Sprint 020A alignment
   - Sprint 020 Phase 1
   - Sprint 020 Phase 2

Особенно:
- shell-first philosophy;
- observability semantics;
- operational density;
- timeline semantics;
- forbidden patterns;
- NL-style adaptation.

---

# Важнейшие ограничения

---

## Категорически запрещено

- ломать existing backend contracts;
- делать giant backend rewrite;
- превращать analytics в marketing dashboard;
- делать decorative charts without operational value;
- внедрять AF dark palette;
- переписывать operator workspace;
- делать broad feature expansion;
- внедрять enterprise complexity ради “красоты”.

---

## Разрешено

- migration analytics/logs на operational shell;
- observability-oriented restructuring;
- reusable operational cards;
- event/timeline semantics;
- metrics hierarchy;
- compact charts/insights;
- structured logs workspace;
- filters/search normalization.

---

# Главная architectural задача

Создать:

```text
administrator observability workspace
```

который:
- визуально принадлежит company shell;
- использует unified operational primitives;
- поддерживает fast scanning;
- поддерживает forensic investigation;
- поддерживает operational monitoring.

---

# Часть 1 — Analytics Workspace

---

# Analytics НЕ должны быть

```text
“красивыми графиками”
```

Analytics должны быть:

```text
operational decision surface
```

---

# Использовать foundation из:

- `OpCard`
- `OpToolbar`
- `OpSplitView`
- status primitives
- metadata primitives
- timeline primitives where relevant

---

# Required analytics structure

---

## 1. Operational overview row

Создать compact overview section.

---

## Обязательные metrics cards

Примеры:
- total requests;
- moderation backlog;
- published responses;
- escalation count;
- AI draft success rate;
- average processing time;
- operator workload;
- unresolved items;
- high priority items.

---

## Important invariant

Metrics cards должны быть:
- compact;
- operationally meaningful;
- quickly scannable.

НЕ giant decorative widgets.

---

# 2. Trends / distribution section

Использовать:
- compact charts;
- operational summaries;
- grouped insights.

---

## Возможные insights

- moderation trends;
- sentiment distribution;
- scenario/category distribution;
- operator throughput;
- publication success/failure;
- escalation trends;
- AI usage distribution.

---

## Important invariant

Charts должны:
- поддерживать operational analysis;
- быть secondary to interpretation;
- не доминировать над workspace.

---

# 3. Issue / anomaly section

Очень важный block.

---

## Показывать

- growing backlog;
- failed publication spikes;
- moderation bottlenecks;
- unusual sentiment spikes;
- operator overload;
- AI generation failures.

---

## Visual semantics

Использовать:
- status pills;
- compact alerts;
- operational summaries;
- severity hierarchy.

---

# 4. Drill-down capability

Analytics должны:
- вести в logs/work-items;
- поддерживать operational investigation;
- быть связаны с lifecycle/workflow.

НЕ isolated “BI dashboard”.

---

# Часть 2 — Logs Workspace

Это critical subsystem.

---

# Logs workspace должен стать

НЕ:

```text
raw technical logs
```

А:

```text
structured operational event stream
```

---

# Использовать как reference

AF Logs console semantics:
- left event stream;
- right detail workspace;
- filters toolbar;
- operational timeline thinking.

НО:
- в NL-style;
- без AF dark aesthetics.

---

# Required logs structure

---

## 1. Event stream panel

Использовать:
- dense operational list;
- compact metadata;
- severity/status hierarchy;
- quick scanning.

---

## Каждый log item должен содержать

### Primary row
- event type;
- request/review id;
- timestamp.

---

### Semantic row
- subsystem;
- status;
- operator;
- AI provider/model if relevant.

---

### Preview row
- short operational summary;
- short error/failure preview if exists.

---

### Status indicators
- severity;
- success/failure;
- escalation;
- retry state.

---

# 2. Logs toolbar

Toolbar обязана поддерживать:

- search;
- severity filter;
- subsystem filter;
- request/review filter;
- operator filter;
- time range;
- refresh.

---

## Important invariant

Toolbar:
- compact;
- sticky where appropriate;
- operationally dense.

НЕ giant filter form.

---

# 3. Event detail workspace

Detail panel должен содержать:

- event metadata;
- operational summary;
- structured payload;
- lifecycle context;
- related events;
- error/failure information;
- timeline relation.

---

## Important invariant

Payload:
- structured;
- readable;
- compact.

НЕ giant raw JSON wall by default.

---

## Разрешено

- collapsible raw payload;
- expandable technical details.

---

# 4. Timeline / event chain

Очень важно.

---

# Logs должны показывать

НЕ isolated events.

А:

```text
event lifecycle chain
```

---

## Нужно поддержать

- previous/next events;
- request lifecycle;
- operational flow visibility;
- escalation chains;
- retry chains;
- publication chains.

---

# Часть 3 — Shared observability primitives

При необходимости создать reusable primitives:

- `OpMetricCard`
- `OpInsightCard`
- `OpEventRow`
- `OpSeverityPill`
- `OpPayloadBlock`
- `OpToolbarSection`
- `OpTrendSection`

---

## Important invariant

НЕ плодить:
- page-specific one-off components;
- duplicated styles;
- fragmented patterns.

---

# Часть 4 — NL-style adaptation

Все observability screens обязаны использовать:

```text
AF operational semantics
+
NL visual language
```

---

# Использовать

- light surfaces;
- calm spacing;
- restrained accents;
- clean borders;
- subtle shadows;
- compact hierarchy;
- operational density.

---

# НЕ использовать

- dark AF palette;
- terminal aesthetics;
- cyberpunk observability;
- neon colors;
- giant animated dashboards.

---

# Часть 5 — Forbidden patterns

---

## Категорически запрещено

- marketing-dashboard aesthetics;
- giant charts without meaning;
- raw JSON-first UX;
- oversized cards;
- giant whitespace;
- weak metadata hierarchy;
- logs as unreadable blobs;
- fragmented filters;
- page-specific styling hacks;
- random spacing;
- CRUD-table mentality.

---

# Часть 6 — Acceptance criteria

Sprint phase считается завершённой только если:

1. Analytics visually integrated into operational shell.
2. Logs workspace implemented as operational event stream.
3. Metrics hierarchy stabilized.
4. Logs support fast operational scanning.
5. Event detail workspace structured clearly.
6. Timeline/event-chain semantics visible.
7. Shared observability primitives created/reused.
8. NL-style preserved.
9. AF dark styling NOT introduced.
10. Operator workspace not broken.
11. Customer-facing contour unaffected.
12. No uncontrolled redesign outside observability layer.

---

# Часть 7 — Deliverables

---

## 1. Implementation

Bounded observability layer implementation:
- analytics workspace;
- logs workspace;
- observability primitives;
- lifecycle/event-chain UX.

---

## 2. Optional document updates

При необходимости:
- compact PROJECT_SOT updates;
- compact IMPLEMENTATION_PLAN updates.

НЕ делать giant rewrites.

---

## 3. Session log

Создать:

```text
docs/cursor_sessions/2026-05-28_sprint_020_phase3_observability_layer.md
```

Session log обязан содержать:

1. Full original prompt.
2. Analytics decisions.
3. Logs workspace decisions.
4. Observability primitives decisions.
5. Timeline/event-chain decisions.
6. Styling decisions.
7. Risks/issues.
8. Remaining future phases.

---

# Важное operational замечание

Это:
- bounded observability sprint.

Следующие phases:
- Prompt/Evaluation workspace;
- Knowledge Base normalization;
- deeper admin tooling evolution.

НЕ пытаться реализовать всё это сейчас.

Maintain strict scope discipline.
