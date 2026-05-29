# Cursor Task 019B — Формализация operational prompt protocol и генерализация operational discipline document

## Контекст

В ходе интенсивной UI и operational разработки проектов:

- Assistant Flow;
- Review Flow;

был выявлен важный engineering pattern:

Cursor значительно лучше справляется со сложными architectural/UI задачами,
если task prompts строятся по строгому operational prompt protocol,
а не в формате коротких conversational instructions.

Данный protocol уже фактически стал частью engineering methodology проектов
и теперь должен быть formalized architecturally.

Одновременно текущий документ:

```text
docs/architecture/operational_discipline_assistant_flow_ru.md
```

слишком жёстко привязан именно к Assistant Flow.

Документ необходимо преобразовать в:

```text
inter-project operational engineering standard
```

который может использоваться:
- в Assistant Flow;
- в Review Flow;
- в будущих AI operational projects.

---

# Главные цели

---

## Goal 1

Formalize operational prompt protocol для постановки Cursor task'ов.

---

## Goal 2

Generalize operational discipline document:
- from project-specific;
- to inter-project engineering methodology.

---

# Требуемая трансформация документа

Текущий документ:

```text
docs/architecture/operational_discipline_assistant_flow_ru.md
```

необходимо преобразовать в generalized operational discipline document.

Новый характер документа:

```text
inter-project operational AI engineering discipline
```

Документ больше не должен предполагать:
- только Assistant Flow;
- только один repository;
- только одну frontend/backend structure.

Вместо этого документ должен описывать:
- роли;
- workflows;
- prompt engineering discipline;
- Cursor interaction model;
- session logging standards;
- operational decomposition;
- architecture-first development approach.

---

# Обязательный новый раздел

Добавить новый major section:

```text
Operational Prompt Protocol
```

Раздел обязан формализовать,
как именно строятся качественные Cursor task prompts.

---

# Обязательные принципы Prompt Protocol

Документ обязан зафиксировать ВСЕ перечисленные ниже принципы.

---

## 1. Prompt как operational specification

Cursor task prompt — это НЕ:
- casual instruction;
- короткая chat request;
- vague feature idea.

Cursor task prompt — это:
- operational specification;
- constrained implementation contract;
- architectural guidance artifact.

---

## 2. Mandatory decomposition

Сложные task'и обязаны явно decomposed на:

- context;
- goals;
- constraints;
- investigation sequence;
- invariants;
- anti-patterns;
- acceptance criteria;
- smoke tests;
- session log requirements.

Cursor НЕ должен infer critical structure implicitly.

---

## 3. Root-cause-first discipline

Repair/debug tasks обязаны prioritise:

```text
forensic investigation before patching
```

Prompt обязан explicitly запрещать:
- blind fixes;
- speculative rewrites;
- uncontrolled refactors.

---

## 4. Explicit anti-scope control

Prompt обязан явно определять:

```text
what this task must NOT do
```

Это mandatory requirement для предотвращения:
- scope explosion;
- accidental redesigns;
- architectural drift;
- unrelated refactors.

---

## 5. Invariant-driven prompting

Critical architectural and UX invariants обязаны формулироваться explicitly.

Особенно для UI tasks:
- visual hierarchy;
- whitespace;
- shell stability;
- contour separation;
- customer-facing vs operational distinction;
- forbidden degradations.

Cursor плохо работает,
когда invariants остаются implicit.

---

## 6. Mixed-language technical protocol

Документ обязан formalize практическое правило:

- narrative и operational explanation могут быть русскими;
- critical technical invariants могут оставаться английскими;
- compact operational English terminology часто полезен.

Примеры:
- customer-facing feel;
- operational workspace;
- shell stability;
- visual hierarchy;
- scope discipline;
- telemetry-heavy redesign.

Цель:
semantic precision,
а не decorative anglicisms.

---

## 7. Acceptance-criteria-first completion

Task completion определяется:
- observable operational outcomes;
- explicit acceptance criteria;
- smoke verification.

А НЕ:
- optimistic Cursor self-reporting.

---

## 8. Session logging discipline

Все substantial tasks обязаны:
- включать prompt text в session log;
- document root cause;
- document changed files;
- document verification steps;
- document remaining risks.

---

## 9. Architecture-first implementation philosophy

Документ обязан reinforce:

```text
architecture → operational decomposition → implementation
```

А НЕ:
- chaotic feature coding;
- uncontrolled iterative patching.

---

## 10. Human supervisory model

Документ обязан explicitly сохранять role model:

- Александр = product owner / operator / final decision-maker;
- ChatGPT (Optimus) = architect / analyst / prompt engineer;
- Cursor = implementation agent.

Cursor НЕ является autonomous product authority.

---

# Дополнительные обязательные улучшения

Также необходимо улучшить document sections, связанные с:

- task naming conventions;
- session log naming conventions;
- git hygiene expectations;
- repository cleanliness;
- operational communication flow;
- implementation-stage sequencing.

---

# Важные ограничения

Запрещено:
- превращать документ в academic essay;
- писать abstract AI philosophy;
- перегружать corporate terminology.

Документ обязан оставаться:
- operational;
- pragmatic;
- implementation-oriented;
- directly usable during real project work.

---

# Deliverables

1. Updated operational discipline document.
2. Clear new structure/headings.
3. Existing useful content preserved where still relevant.
4. Assistant Flow-specific assumptions generalized.
5. New Prompt Protocol section coherently integrated.

---

# Session log requirement

Создать/update session log внутри:

```text
docs/cursor_sessions/
```

Session log обязан включать:
- full task prompt;
- document transformation summary;
- major new sections;
- rationale for changes.

---

# Implementation report (2026-05-28)

## What changed

Updated `docs/architecture/operational_discipline_assistant_flow_ru.md` into an inter-project document while keeping the file path stable (to avoid breaking references).

## Major transformation summary

- **Scope generalized**: removed “Assistant Flow-only” framing and replaced with “inter-project AI-assisted engineering workflow”.
- **New major section added**: `# 0. Operational Prompt Protocol` (as requested).
- **Principles included**: all 10 prompt protocol principles were added as explicit subsections (0.1–0.10).
- **Existing useful content preserved**: roles, lifecycle, memory model, token economy, session logging, scope discipline kept intact with minimal edits.

## Rationale (why this structure)

- Keeping the original file path minimizes churn across repositories and session logs while still achieving the “generalized standard” goal.
- The new section is placed early as “Section 0” because it is foundational for the rest of the workflow; it acts as a contract for subsequent lifecycle sections.

## Files changed

| File | Change |
|---|---|
| `docs/architecture/operational_discipline_assistant_flow_ru.md` | Generalized doc + added Operational Prompt Protocol section |
| `docs/cursor_sessions/2026-05-28_cursor_task_019B_prompt_protocol_formalization.md` | Session log |
