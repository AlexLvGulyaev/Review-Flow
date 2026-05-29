# Cursor Task 020B — Formalize SOT vs Implementation responsibilities and synchronize project memory

## Контекст

В ходе развития operational discipline и project memory model
была выявлена важная architectural inconsistency между:

* PROJECT_SOT;
* IMPLEMENTATION_PLAN;
* session logs.

Текущее состояние:

* PROJECT_SOT активно развивается и обновляется;
* session logs регулярно фиксируются;
* IMPLEMENTATION_PLAN практически не обновлялся со старта проекта.

Это привело к architectural ambiguity:

не до конца определено:

* что фиксируется в PROJECT_SOT;
* что фиксируется в IMPLEMENTATION_PLAN;
* что остаётся только в session logs.

---

# Главная цель task

Formalize responsibilities между:

```text
PROJECT_SOT
IMPLEMENTATION_PLAN
session logs
```

и синхронизировать текущий Review Flow project memory
с фактической историей развития проекта.

---

# Важный architectural principle

Должно существовать чёткое разделение:

| Artifact            | Responsibility            |
| ------------------- | ------------------------- |
| PROJECT_SOT         | Чем проект является       |
| IMPLEMENTATION_PLAN | Как проект развивается    |
| session logs        | Что конкретно происходило |

---

# Часть 1 — Обновление operational discipline

Документ:

```text
docs/architecture/operational_discipline_assistant_flow_ru.md
```

необходимо дополнить explicit rules:

---

## 1. PROJECT_SOT responsibility model

PROJECT_SOT обязан хранить:

* architecture;
* product semantics;
* operational semantics;
* UI contracts;
* role model;
* accepted constraints;
* active contours;
* infrastructure model;
* current architectural reality.

PROJECT_SOT НЕ должен:

* превращаться в sprint chronology;
* хранить granular implementation history;
* хранить детальные execution narratives.

---

## 2. IMPLEMENTATION_PLAN responsibility model

IMPLEMENTATION_PLAN обязан хранить:

* implementation strategy;
* milestone structure;
* completed milestones;
* active sprint;
* implementation evolution;
* changed priorities;
* discovered implementation realities;
* roadmap evolution.

IMPLEMENTATION_PLAN является:

```text
living implementation roadmap
```

а не frozen bootstrap document.

---

## 3. Session log responsibility model

Session logs обязаны хранить:

* detailed execution history;
* forensic investigation;
* root causes;
* changed files;
* exact implementation details;
* commands;
* operational findings.

Session logs НЕ являются:

* canonical architecture;
* implementation roadmap.

---

## 4. Sprint completion workflow

Добавить explicit operational rule:

После завершения significant sprint:

### PROJECT_SOT обновляется:

если изменились:

* architecture;
* UX contracts;
* operational semantics;
* contours;
* infrastructure;
* role model;
* accepted engineering constraints.

### IMPLEMENTATION_PLAN обновляется:

если изменились:

* implementation strategy;
* milestone sequence;
* roadmap;
* active priorities;
* sprint structure;
* implementation phases.

### Session log сохраняется всегда.

---

# Часть 2 — Обновление PROJECT_SOT

Необходимо обновить текущий Review Flow PROJECT_SOT.

PROJECT_SOT должен начать отражать current architectural reality проекта.

---

## Обязательно зафиксировать

---

### 1. Customer-facing contour stabilization

Зафиксировать:

* отдельный customer-facing contour;
* production-like UX philosophy;
* separation between customer-facing и operational UI;
* modal-driven customer workflow;
* public-facing branding direction.

---

### 2. Company workspace philosophy

Зафиксировать:

* internal operational workspace;
* AF-style operational direction;
* operator/admin separation inside company contour;
* operational UI hierarchy.

---

### 3. Operational prompt discipline

Добавить краткую фиксацию:

* operational prompt protocol;
* architecture-first workflow;
* bounded execution model;
* session-log engineering workflow.

НЕ дублировать весь operational discipline document.

Только high-level architectural фиксацию.

---

### 4. Current project phase

Добавить краткую фиксацию current stage проекта:

```text
customer-facing contour stabilized;
company workspace/admin contour under active development.
```

---

# Часть 3 — Обновление IMPLEMENTATION_PLAN

IMPLEMENTATION_PLAN необходимо преобразовать:

из:

* initial static roadmap;

в:

* living implementation roadmap.

---

# Обязательные изменения IMPLEMENTATION_PLAN

---

## 1. Добавить completed sprint history

Необходимо зафиксировать:

---

### Sprint 001–016

Initial blind implementation sprint.

Характеристика:

* реализация core architecture;
* backend pipeline;
* PostgreSQL schema;
* initial role model;
* initial operator/admin UI;
* deployment contour;
* implementation mainly without deep UI stabilization.

---

### Sprint 017–018

Customer-facing UI stabilization sprint.

Зафиксировать:

* homepage redesign;
* modal UX stabilization;
* customer-facing visual philosophy;
* contour separation;
* production-like public UI direction;
* operational vs customer-facing distinction.

---

### Sprint 019

Operator console stabilization sprint.

Зафиксировать:

* operator data-fetch repair;
* API URL stabilization;
* role-aware request alignment;
* preparation for AF-style operational redesign.

---

## 2. Добавить Current Sprint section

Добавить current active sprint:

```text
Sprint 020 — Company/Admin Workspace Stabilization
```

Current goals:

* operational workspace;
* admin shell;
* navigation hierarchy;
* AF-style operational console direction;
* role separation;
* analytics/logs/prompts foundation.

---

## 3. Добавить Roadmap Evolution section

Кратко зафиксировать,
что проект evolution изменился:

от:

* linear implementation;

к:

* iterative operational engineering workflow.

Зафиксировать:

* repair/stabilization sprints;
* UX refinement passes;
* architecture evolution;
* operational discipline evolution.

---

## 4. НЕ разрушать исходную структуру

Важно:

НЕ превращать IMPLEMENTATION_PLAN в giant retrospective document.

Сохранить:

* milestone structure;
* implementation phases;
* initial roadmap usefulness.

Но дополнить:

* current operational reality.

---

# Acceptance criteria

Task считается завершённым только если:

1. Operational discipline formalizes:

   * PROJECT_SOT responsibilities;
   * IMPLEMENTATION_PLAN responsibilities;
   * session log responsibilities.

2. Sprint completion workflow clearly defined.

3. PROJECT_SOT updated to reflect current architectural reality.

4. IMPLEMENTATION_PLAN transformed into living roadmap.

5. Completed sprint history added.

6. Current sprint added.

7. Existing milestone structure preserved.

8. Documents remain:

   * operational;
   * concise;
   * engineering-oriented.

---

# Session log requirements

Создать/update session log:

```text
docs/cursor_sessions/2026-05-28_cursor_task_020B_sot_vs_implementation_responsibilities.md
```

Session log обязан содержать:

1. Full original prompt text.
2. Какие sections operational discipline изменены.
3. Что добавлено в PROJECT_SOT.
4. Что добавлено в IMPLEMENTATION_PLAN.
5. Как formalized artifact responsibility model.
6. Remaining recommendations.

---

# Важное operational замечание

Это НЕ task на:

* rewriting architecture;
* rewriting roadmap from scratch;
* giant retrospective;
* documentation beautification.

Это:

* operational memory synchronization task;
* architectural consistency task;
* engineering workflow stabilization task.

Maintain strict scope discipline.

---

# Implementation report (2026-05-28)

## 1) Operational discipline changes

File: `docs/architecture/operational_discipline_assistant_flow_ru.md`

Added/updated:
- **`## 5.1.2 Responsibility model: PROJECT_SOT vs IMPLEMENTATION_PLAN vs session logs`**
  - Explicit responsibilities table and rules for each artifact.
- **Sprint completion sync rule** (added into sprint lifecycle section “Этап 6”)
  - When to update PROJECT_SOT vs IMPLEMENTATION_PLAN, and that session log is always saved.

## 2) What added to PROJECT_SOT

File: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`

Added section under `## 4`:
- **`### 4.0 Текущая фаза проекта (current architectural reality)`**
- **`### 4.0.1 Customer-facing contour stabilization`**
- **`### 4.0.2 Company workspace philosophy`**
- **`### 4.0.3 Operational prompt discipline`**

Content is intentionally high-level (does not duplicate the full discipline document).

## 3) What added to IMPLEMENTATION_PLAN

File: `IMPLEMENTATION_PLAN.md`

Added new compact “living roadmap” layer before `# 5`:
- `# 4.1 Roadmap Evolution (living plan)`
- `## 4.2 Completed sprint history (compact)`:
  - Sprint 001–016 (initial implementation)
  - Sprint 017–018 (customer-facing stabilization)
  - Sprint 019 (operator stabilization)
- `## 4.3 Current Sprint`:
  - Sprint 020 — Company/Admin Workspace Stabilization

This preserves the original stage structure while adding current operational reality.

## 4) Formalized artifact responsibility model

Target invariant:

| Artifact | Responsibility |
|---|---|
| PROJECT_SOT | Чем проект является |
| IMPLEMENTATION_PLAN | Как проект развивается |
| session logs | Что конкретно происходило |

PROJECT_SOT: architecture/semantics/contracts/constraints, no sprint chronology.  
IMPLEMENTATION_PLAN: roadmap evolution + active sprint, no granular execution narrative.  
Session logs: forensic + root cause + changed files + commands (not canonical architecture).

## 5) Remaining recommendations

- In each project, explicitly bind `PROJECT_SOT` path in bootstrap prompts and (optionally) in `README.md`.
- Keep sprint history compact; deep details stay in `docs/cursor_sessions/*`.

## Changed files

- `docs/architecture/operational_discipline_assistant_flow_ru.md`
- `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- `IMPLEMENTATION_PLAN.md`
- `docs/cursor_sessions/2026-05-28_cursor_task_020B_sot_vs_implementation_responsibilities.md`
