# 2026-05-28 — Sprint 020 Phase 4: Knowledge Base workspace normalization

## Full original prompt

Source: `cursor_tasks_local/2026-05-28_sprint_020_phase4_knowledge_base_workspace.md`

---

# Sprint 020 Phase 4 — Knowledge Base Workspace Normalization
... (prompt continues; see task file) ...

---

## KB workspace decisions

### Objective

Replace isolated CRUD pages with a **unified list/detail/editor knowledge workspace** that:

- belongs visually to the company shell
- uses `op-*` operational primitives
- supports fast scanning + compact editing
- makes entity relationships visible (relationship-first UX)

### Implementation approach (contract-preserving)

- Keep existing routes for compatibility:
  - `/admin/phrases`
  - `/admin/templates`
  - `/admin/scenarios`
  - `/admin/sentiments`
  but render the **same unified workspace** component with different `initialEntityKey`.
- Do not change backend contracts or DB schema.
- Fetch all KB entity lists in parallel to enable relationship visibility without backend support for joins/usage counts.

---

## Relationship UX decisions

Relationships are displayed as **derived links** (based on existing fields) to avoid backend changes:

- Scenario → linked phrases/templates by matching `scenario` code
- Sentiment → linked phrases/templates by matching `sentiment` code
- Template/Phrase → show targeting hints (scenario/sentiment/priority) + summary pills

These are shown as compact relationship blocks (pills), not as big tables.

---

## Shared primitives decisions

Created shared KB workspace implementation under `frontend/src/ops/kb/`:

- `KnowledgeBaseWorkspace.jsx` — unified list/detail/editor model
- `kbModel.js` — entity configuration (fields, list semantics, defaults)
- primitives:
  - `OpEditorSection`
  - `OpRelationshipBlock`

All visuals are NL-style and use `op-*` scoping to prevent styling drift.

---

## Styling decisions

- Added minimal KB workspace styles inside `frontend/src/ops/ops.css`:
  - entity-type segmented selector (`op-seg*`)
  - editor sections (`op-editor*`)
  - relationship blocks (`op-relationship*`)
- No AF dark palette introduced.

---

## Risks / issues

- Relationship visibility is derived client-side (string matches); it is informative, not authoritative usage analytics.
- Workspace currently loads all four lists each time for relationship visibility; acceptable for bounded admin scale.
- AI providers configuration remains on its existing page; Phase 4 focuses on the four mandatory KB entities.

---

## Changed files

- `frontend/src/ops/kb/KnowledgeBaseWorkspace.jsx`
- `frontend/src/ops/kb/kbModel.js`
- `frontend/src/ops/kb/components/OpEditorSection.jsx`
- `frontend/src/ops/kb/components/OpRelationshipBlock.jsx`
- `frontend/src/ops/ops.css`
- `frontend/src/pages/admin/AdminPhrasesPage.jsx`
- `frontend/src/pages/admin/AdminTemplatesPage.jsx`
- `frontend/src/pages/admin/AdminScenariosPage.jsx`
- `frontend/src/pages/admin/AdminSentimentsPage.jsx`

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
- deeper admin tooling evolution
- advanced AI operational workflows

