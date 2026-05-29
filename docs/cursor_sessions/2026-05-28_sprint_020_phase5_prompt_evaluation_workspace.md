# 2026-05-28 — Sprint 020 Phase 5: Prompt + Evaluation workspace

## Full original prompt

Source: `cursor_tasks_local/2026-05-28_sprint_020_phase5_prompt_evaluation_workspace.md`

---

# Sprint 020 Phase 5 — Prompt + Evaluation Workspace
... (prompt continues; see task file) ...

---

## Prompt workspace decisions

### Objective

Turn prompt management into a **versioned operational AI configuration workspace** with lifecycle visibility and safe activation semantics.

### Implementation (contract-preserving)

- `/prompts` migrated to `op-*` primitives:
  - `OpPage` + `OpPageHeader`
  - compact toolbar (search + active-only)
  - split list/detail workspace
  - structured header + activation action (no dark theme, no giant forms)
- Prompt editor remains bounded:
  - shows system + user template in readable blocks (read-only for existing versions)
  - “Create new version” remains in the workspace as a structured editor section

Relationship visibility:
- Backends do not expose direct links to KB entities; this phase keeps linkage conceptual (prompt_key + version + activation).

---

## Evaluation UX decisions

### Objective

Turn evaluation into an **AI quality review workspace** supporting expected-vs-actual review and scoring.

### Implementation (contract-preserving)

- `/evaluation` migrated to `op-*` primitives:
  - create-case section (bounded)
  - toolbar (search + min-score)
  - split list/detail workspace
- Detail workspace:
  - case header + linkage pills
  - customer request block
  - expected vs actual comparison (`OpComparisonBlock`)
  - reviewer notes / scoring block (PATCH existing endpoint)
  - conceptual linkage guidance: “investigate in `/logs` by review_id”

---

## Governance primitives decisions

Created reusable comparison primitive:

- `frontend/src/ops/governance/OpComparisonBlock.jsx`

This provides a calm, diff-friendly, side-by-side comparison surface without introducing heavy diff tooling.

---

## Relationship visibility decisions

- Prompts: lifecycle visibility (active/inactive) + metadata + safe activation.
- Evaluation: links to prompt version and review_id are displayed; KB linkage stays conceptual due to API limits.

No backend contract changes were introduced.

---

## Styling decisions

- Added minimal governance comparison styles in `frontend/src/ops/ops.css`.
- NL-style preserved; no AF dark palette introduced.

---

## Risks / issues

- Direct KB relationship mapping for prompts is limited by API (prompt entity does not expose scenario/template linkage).
- Evaluation “expected” is only notes (by current schema); comparison remains useful but bounded.

---

## Changed files

- `frontend/src/pages/PromptsPage.jsx`
- `frontend/src/pages/EvaluationPage.jsx`
- `frontend/src/ops/governance/OpComparisonBlock.jsx`
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

- stabilization pass / visual QA
- smoke testing
- demo/presentation preparation

