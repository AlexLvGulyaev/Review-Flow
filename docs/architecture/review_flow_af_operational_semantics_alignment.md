# Review Flow — AF operational semantics alignment (Sprint 020B)

## Purpose

This document calibrates the **semantic / cognitive model** of Review Flow company workspace toward:

```text
AI operational execution console
```

It complements:
- `docs/architecture/operator_workspace_operational_ui_alignment.md` (structural mapping, UI invariants)
- `docs/architecture/operational-console-ui-contract.md` (AF console interaction contract reference)

Scope: **semantics + cognition + bounded roadmap**, not CSS polishing.

---

## What “AF operational console” means (cognitive model)

Assistant Flow is not an “admin panel”. It is:

- an execution console
- with a trace-first mental model
- where the “primary object” is a lifecycle/execution, not a record

Review Flow must shift operator/admin surfaces from:

- “карточка обращения / редактирование записи”

to:

- “execution/lifecycle workspace”

---

## Semantic gap analysis (current Review Flow vs AF)

### 1) CRM/CRUD cues that still leak into Review Flow

- **Edit-form centric** blocks: long linear sections look like “fill a form”, not “inspect a trace”.
- **Lack of explicit primary/secondary separation** inside detail panel: too many “same weight” sections.
- **Timeline looks like history**, not as an execution trace with a stage contract.
- **Relationship context is shallow**: why an item is in this state is not always immediately visible.

### 2) AF cues to adopt (without copying dark aesthetics)

- **Left column is an operational stream** (work-items / events), not a list of entities.
- **Right column is a persistent workspace** with a strict internal hierarchy:
  - top telemetry summary
  - primary artifact blocks
  - trace/timeline
  - expandable technical details
- **Timeline contract** (trace-first):
  - stage name + timestamp + status/latency
  - details are secondary and collapsible
- **System vs human vs public separation** is rigid and visible.

---

## Operator eye-flow (target hierarchy)

### Primary focus (first glance)

1) Item identity + lifecycle state (request id, moderation/publication, priority)  
2) What action is expected now (approve / reject / revision / edit)  
3) What the system produced vs what human changed (AI draft vs operator revision vs published)  

### Secondary focus

- classification summary (scenario/sentiment/topic/priority + source/confidence)
- template/phrase hints

### Telemetry-only / collapsible

- raw payloads
- long metadata
- event details beyond “stage contract”

---

## Timeline semantics (execution trace, not history)

### Required properties

- timeline is **always visible** in the workspace (not hidden below fold)
- stages are presented as an execution contract:
  - time
  - stage label
  - status
  - (where available) latency/delta
- expanded technical details exist but are secondary

### Review Flow mapping (canonical stages)

1) Review received  
2) Classification completed  
3) Template selected  
4) AI draft generated  
5) Handed to operator  
6) Operator edited  
7) Moderation outcome  
8) Published  

This set is intentionally bounded to what exists in current contracts.

---

## Workspace semantics (right column block taxonomy)

Define blocks by intent:

- **Primary operational blocks**: identity/status, customer request, response pipeline
- **Lifecycle blocks**: timeline + event chain
- **Telemetry blocks**: compact metadata panels, classification hints
- **Editable blocks**: operator revision only (strictly separated)
- **Publication blocks**: published/public response visibility

---

## AI vs Human separation (non-negotiable)

Three layers must never be visually merged:

- AI Draft (system-generated)
- Operator Revision (human-editable)
- Published/Public (customer-visible)

Each layer must have:
- explicit label
- its own surface
- clear linkage to lifecycle status

---

## Density model (AF-style scanning without clutter)

Density in AF is not “smaller fonts everywhere”.
It is:
- compact rhythm
- consistent hierarchy
- removal of empty vertical gaps
- predictable placement of filters, actions, and trace information

---

## Bounded implementation roadmap (post-calibration)

This calibration does **not** authorize a full rewrite. Recommended bounded phases:

### Phase C1 — Timeline contract hardening

- unify timeline row semantics across operator + logs
- ensure “trace-first” header line and collapsible details rule

### Phase C2 — Workspace telemetry grouping

- ensure top-of-detail has compact telemetry panels (not stretched)
- demote technical payloads to collapsible blocks

### Phase C3 — AI/Human/Public separation enforcement

- harden the three-layer response pipeline pattern everywhere it appears

### Phase C4 — Operator action layer semantics

- contextual actions based on lifecycle state; avoid random button collections

### Phase C5 — Density normalization pass

- remove leftover CRM-like spacing and long linear form feel

---

## Required doc updates (this repo)

- Update `docs/architecture/operational-console-ui-contract.md` with a **Review Flow addendum**:
  - which parts of the AF contract are adopted as cross-project invariants
  - mapping of “session/execution” to “review/work-item”
- Update `docs/architecture/PROJECT_STATE.md` with a compact note:
  - Review Flow uses this AF contract as a semantic reference (cross-project portability)
- Add/restore `docs/architecture/operational_discipline_universal_ru.md` as a pointer to the active discipline doc in this repo.

