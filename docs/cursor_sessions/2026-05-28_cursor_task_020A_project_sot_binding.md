# Cursor Task 020A — Generalize PROJECT_STATE into PROJECT_SOT binding model

## Контекст

В ходе формализации межпроектной operational discipline был выявлен architectural inconsistency между:

* operational discipline document;
* actual project Source of Truth structure.

Текущая версия operational discipline использует жёсткое понятие:

```text
PROJECT_STATE.md
```

как universal canonical project state artifact.

Однако в реальных проектах Source of Truth может называться по-разному.

Пример текущего проекта Review Flow:

Source of Truth фактически является документ:

```text
Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
```

и именно он:

* описывает architecture;
* фиксирует product decisions;
* определяет UI contours;
* задаёт operational semantics;
* используется как implementation baseline.

Следовательно:

жёсткая привязка operational discipline к имени:

```text
PROJECT_STATE.md
```

является incorrect abstraction.

---

# Главная цель

Преобразовать текущую модель:

```text
PROJECT_STATE.md = universal canonical artifact
```

в generalized binding model:

```text
PROJECT_SOT = canonical source-of-truth artifact конкретного проекта
```

---

# Требуемое архитектурное изменение

Operational discipline должна перейти:

от:

* hardcoded filename model;

к:

* abstract SOT binding model.

---

# Основной architectural principle

Не существует обязательного universal filename.

Существует:

```text
PROJECT_SOT
```

как logical operational entity.

Конкретный:

* filename;
* path;
* structure;

могут различаться между проектами.

---

# Обязательные изменения документа

Документ:

```text
docs/architecture/operational_discipline_assistant_flow_ru.md
```

необходимо обновить.

---

## 1. Ввести понятие PROJECT_SOT

Добавить explicit definition:

```text
PROJECT_SOT = главный canonical source-of-truth artifact проекта
```

PROJECT_SOT обязан содержать:

* architecture;
* operational decisions;
* infrastructure;
* current state;
* UI contracts;
* roadmap;
* accepted engineering constraints.

---

## 2. Убрать hardcoded universal dependency на PROJECT_STATE.md

Все sections, где сейчас фигурирует:

```text
PROJECT_STATE.md
```

необходимо generalized.

Правильная модель:

```text
PROJECT_SOT
```

с optional examples.

Например:

```text
PROJECT_STATE.md
Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
docs/project/project_sot.md
```

---

## 3. Добавить новый раздел — Project SOT Binding

Добавить отдельный section примерно следующего смысла:

---

### Project SOT Binding

Каждый проект обязан явно фиксировать:

```text
PROJECT_SOT
```

то есть:

* canonical source-of-truth document;
* его path;
* его роль в workflow.

PROJECT_SOT:

* не обязан называться PROJECT_STATE.md;
* может иметь project-specific naming;
* обязан быть uniquely identifiable внутри repository.

Все:

* Cursor tasks;
* bootstrap prompts;
* session workflows;
* operational references;

обязаны ссылаться именно на PROJECT_SOT данного проекта.

---

## 4. Обновить lifecycle wording

В sections:

* project memory;
* sprint lifecycle;
* bootstrap prompts;
* architectural memory;

заменить wording:

```text
прочитай PROJECT_STATE
```

на generalized wording:

```text
прочитай PROJECT_SOT проекта
```

---

## 5. Обновить bootstrap workflow

Bootstrap workflow обязан explicitly требовать:

* указание PROJECT_SOT path;
* передачу relevant session logs;
* bounded subsystem scope.

---

## 6. Сохранить backward compatibility

Важно:

НЕ ломать existing workflow для проектов,
где:

```text
PROJECT_STATE.md
```

уже используется как canonical artifact.

PROJECT_STATE.md должен остаться:

* valid;
* supported;
* recommended-by-default naming.

Но:

* НЕ mandatory universal standard.

---

# Важные ограничения

Запрещено:

* переписывать весь документ заново;
* превращать документ в abstract methodology essay;
* разрушать existing operational structure;
* переименовывать файл документа;
* делать broad refactor unrelated sections.

Task строго ограничен:

* SOT abstraction;
* wording alignment;
* workflow alignment.

---

# Acceptance criteria

Task считается завершённым только если:

1. В operational discipline formalized понятие PROJECT_SOT.
2. Убрана жёсткая universal dependency на PROJECT_STATE.md.
3. Добавлен section `Project SOT Binding`.
4. Lifecycle wording generalized корректно.
5. Existing operational structure preserved.
6. Existing PROJECT_STATE-based workflows remain compatible.
7. Документ остаётся:

   * operational;
   * concise;
   * implementation-oriented.

---

# Session log requirements

Создать/update session log:

```text
docs/cursor_sessions/2026-05-28_cursor_task_020A_project_sot_binding.md
```

Session log обязан содержать:

1. Full original prompt text.
2. Какие sections изменены.
3. Как generalized SOT model реализована.
4. Какие wording patterns заменены.
5. Как обеспечена backward compatibility.
6. Remaining recommendations.

---

# Важное operational замечание

Это НЕ task на:

* redesign workflow;
* новую methodology;
* глобальную restructuring operational discipline.

Это bounded architectural consistency task.

Maintain strict scope discipline.

---

# Implementation report (2026-05-28)

## Sections changed

- `# 4. Жизненный цикл`:
  - bootstrap требования обновлены: ссылка на **PROJECT_SOT** вместо `PROJECT_STATE.md`.
- `# 5. Модель памяти проекта`:
  - `## 5.1` переписан в модель **PROJECT_SOT** (с примерами).
  - добавлен новый раздел `## 5.1.1 Project SOT Binding`.
- `# 9. Краткая схема взаимодействия`:
  - заменено `PROJECT_STATE + session logs` → `PROJECT_SOT + session logs`.

## How generalized SOT model implemented

- Введена логическая сущность **PROJECT_SOT** как canonical source-of-truth artifact проекта.
- В документе описано, что PROJECT_SOT может иметь разные path/filename в разных репозиториях.
- Добавлены примеры допустимых именований (включая `PROJECT_STATE.md` и `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`).

## Wording patterns replaced

- `ссылаться на PROJECT_STATE` → `ссылаться на PROJECT_SOT проекта (path + назначение)`.
- `обновляется PROJECT_STATE.md` → `обновляется PROJECT_SOT (если изменились architecture/constraints/contracts)`.
- `PROJECT_STATE + session logs` → `PROJECT_SOT + session logs`.

## Backward compatibility

- `PROJECT_STATE.md` оставлен как **valid и recommended-by-default** naming.
- Убрана mandatory universal dependency: теперь `PROJECT_STATE.md` — частный случай PROJECT_SOT.

## Remaining recommendations

- В каждом репозитории иметь явное “binding” место, где указан PROJECT_SOT (path + роль):
  - либо в `README.md`, либо в `PROJECT_SOT.md`-stub, либо в `docs/architecture/*`.
- В bootstrap prompts всегда указывать: `PROJECT_SOT=<path>` + 1–3 релевантных session logs.
