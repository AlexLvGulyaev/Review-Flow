# Sprint 020I — Strict Layout Corrections / No Autonomous UX Decisions

**Дата:** 2026-05-29  
**Задача:** `cursor_tasks_local/2026-05-29_sprint_020i_operator_console_strict_layout_corrections.md`

---

## FULL PROMPT (summary)

Literal execution only — no redesign, no UX exploration.

1. Queue toolbar: filters row → **separate** search row → pagination row → list (AF `LogsPage` structure).
2. Metadata: two independent panels, equal **outer** height only — no shared internal grid.
3. Remove sublabel «Текст обращения» (no replacement).
4. Sidebar narrower, queue wider (operational scanning).
5. No autonomous layout merges/compactification.
6. `npm run build` + session log with defect list and confirmations.

---

## Exact list of corrected defects (020H regressions)

| Defect | Was (020H) | Fixed (020I) |
|--------|------------|--------------|
| Search placement | Merged into `rf-oc-toolbar` grid with filters + refresh | Dedicated full-width `rf-oc-search` row after `rf-oc-filter-row` |
| Pagination | Inline inside `rf-oc-filter-meta` with counters | Separate `rf-oc-page-controls` row (AF `logs-page-controls`) |
| Refresh | Icon in filters toolbar | In `rf-oc-filter-meta` row only (with counters) |
| Metadata layout | Unified `rf-oc-meta-matrix` (4-col paired rows) | Two `rf-oc-summary-col` + independent `rf-oc-kv-list` each |
| Panel height | Internal row sync / hidden spacer row | `align-items: stretch` on grid; inner `dl` natural flow |
| Customer panel caption | `caption="Текст обращения"` | Removed (title only) |
| Sidebar width | 220px | **200px** (`--op-sidebar-w`) |
| Queue width | 420px | **460px** (fixed column) |

---

## Layout changes

- `OperatorLeftPanel.jsx` — restored 4-row filter stack per AF.
- `OperatorModerationWorkspace.jsx` — reverted dual summary columns; removed caption prop.
- `operator-console.css` — removed `.rf-oc-toolbar`, `.rf-oc-meta-matrix`; filter row 4 columns; search/pagination rows.
- `ops.css` — sidebar 200px.

## Proportions

| Element | Before 020I | After 020I |
|---------|-------------|------------|
| Company sidebar | 220px | 200px |
| Queue column | 420px | 460px |

AF reference unchanged: `/opt/assistant-flow` — `LogsPage.tsx` lines 260–334 (`logs-filter-row` → `logs-search` → `logs-filter-meta` → `logs-page-controls`).

## BEFORE/AFTER screenshots

Не снимались (headless environment).

## Explicit confirmation

- [x] **Search row restored separately** — not merged with filters or pagination.
- [x] **Metadata panels no longer unified internally** — no `rf-oc-meta-matrix`; left/right each own `dl`.
- [x] **«Текст обращения» removed** — not replaced with another label.
- [x] **No autonomous UX reinterpretations** — only literal prompt items; kept 020H items not contradicted (io-grid side-by-side, editor actions in header).

## Build result

```text
vite v6.4.2 — ✓ built in ~2.7s
```
