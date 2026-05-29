# Sprint 022B — C1. Обновление SOT и архитектуры Controlled Hybrid

**Date:** 2026-05-30  
**Status:** Completed (C1 documentation only)  
**Type:** Documentation / architecture — **no code, DB, or UI changes**

**Task source:** `cursor_tasks_local/2026-05-30_sprint_022b_ch_sot_architecture_update_ru.md`

---

## Executive summary

Зафиксирован переход проекта на **Controlled Hybrid** как целевую архитектуру. Типовая ситуация (`response_cases`) объявлена SOT бизнес-решения. Текущий MVP (LLM classification + template scoring) явно отделён от целевого pipeline. Описаны UI-контуры, целевая модель данных, разрыв as-is vs target, циклы C1–C7, принципы миграции. **C1 выполнен; C2–C7 не реализованы.**

---

## Studied documents

| Document | Use |
|----------|-----|
| `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md` | Gap analysis, API/UI inventory |
| `docs/cursor_sessions/2026-05-30_sprint_021b_pipeline_forensics_template_selection_and_classification.md` | Current pipeline facts |
| `docs/cursor_sessions/2026-05-29_sprint_021a_normalize_classification_reference_data_fk.md` | FK reference model |
| `docs/cursor_sessions/2026-05-29_sprint_020j_operator_console_localization_and_finalization.md` | Accepted operator UX |
| `docs/cursor_sessions/2026-05-27_cursor_task_018B_status_dialog_and_review_id_normalization.md` | Accepted customer IDs/status |
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | Base SOT |
| `IMPLEMENTATION_PLAN.md` | Roadmap |
| `README.md` | Public overview |

---

## Changed documents

| File | Change |
|------|--------|
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | §3.1–3.2 dual layer; **new §3A** (CH business model, pipeline, gap, UI, data model, migration, C1–C7); as-is markers §4.1, §5 |
| `IMPLEMENTATION_PLAN.md` | New section **«Переход на Controlled Hybrid»** (cycles, dependencies, C2 prep) |
| `README.md` | Current vs target architecture blocks; pointer to SOT §3A |

---

## SOT changes (summary)

1. **§3.1–3.2** — CH as target; MVP as current runtime.
2. **§3A.1** — Business principles (case = SOT, LLM not decision maker).
3. **§3A.2** — Target pipeline diagram.
4. **§3A.3** — Gap table (no `response_cases`, LLM classify, heuristic templates).
5. **§3A.4** — Customer / operator / admin contours (accepted vs not implemented).
6. **§3A.5** — Target entities + mapping to existing tables + cycle column.
7. **§3A.6** — Eight migration principles.
8. **§3A.7** — C1–C7 table + owner acceptance rule; only C1 done.
9. **§4.1, §5** — Labeled as current MVP; pointers to §3A.

---

## IMPLEMENTATION_PLAN changes

- Section **«Переход на Controlled Hybrid»**: cycle status table, dependency order, C1 done, C2 preparation outline, C3–C7 summaries.
- Explicit: future cycles **not** claimed as implemented.

---

## README changes

- Opening line: MVP vs target CH.
- Architecture split: **Current runtime** vs **Target (not fully implemented)**.

---

## Target architecture (normative)

Controlled Hybrid: `response_cases` as business SOT → retrieval → confidence branches → case policy → bounded LLM → operator/KB feedback. С/Т/П — attributes of case.

---

## Already implemented (unchanged by C1)

- Customer: submit, `NL-XXXXXXXX-NNN`, status by email, stepper, published response.
- Operator: queue, detail, approve, reject-feedback modal, post-publish lock, lifecycle logs.
- Admin: phrases, templates, scenarios, sentiments (FK), prompts, evaluation, analytics, logs, AI providers.
- Backend: phrase fuzzy match, LLM classification, FK template selection, LLM generation, moderation.

---

## Risks and unknowns

| Risk | Note |
|------|------|
| C1 ≠ CH in code | Teams must not assume case entity exists after 022B |
| Case UX not specified in wireframes | Operator/admin CH screens TBD |
| Auto-publish per case | Target only; not in MVP |
| Migration effort C2→C6 | Backfill from phrases/templates needs detailed design in C2 |
| Formal owner acceptance | Process outside repo |

---

## Verification commands

```bash
git diff --stat
git diff -- Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md IMPLEMENTATION_PLAN.md README.md
```

**Expected:** only documentation files changed.

---

## Statement

**No backend code, frontend code, database migrations, or runtime logic were modified.**

---

## FULL PROMPT
# Sprint 022B — C1. Обновление SOT и архитектуры Controlled Hybrid

## Тип задачи

Документационная и архитектурная задача.

Запрещено:

- изменять backend-код;
- изменять frontend-код;
- создавать миграции БД;
- выполнять рефакторинг;
- менять runtime-логику системы.

Цель спринта — зафиксировать в SOT проекта переход к целевой архитектуре Controlled Hybrid и обновить связанные проектные документы.

---

## Исходные материалы

Обязательно изучить:

1. docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md
2. Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
3. IMPLEMENTATION_PLAN.md
4. README.md
5. Логи сессий Cursor по:
   - клиентскому UI;
   - операторской консоли;
   - модалке отклонения;
   - FK-нормализации классификации;
   - forensic-анализу pipeline (021B).

Использовать только фактическое состояние репозитория.

Если функция ещё не реализована, явно помечать:

«Целевая архитектура (не реализовано)».

Не выдавать планируемое за реализованное.

---

## Зафиксированное бизнес-решение

Целевой архитектурой проекта является Controlled Hybrid.

Ключевой принцип:

Типовая ситуация (Response Case) является единственным источником бизнес-решения (SOT).

Retrieval / matching определяет наиболее подходящую типовую ситуацию.

Типовая ситуация содержит утверждённую политику ответа и/или связанный типовой ответ.

LLM может:
- адаптировать текст;
- извлекать признаки;
- помогать в подготовке черновика.

LLM не должна являться основным источником бизнес-решения.

Оператор принимает решение по спорным случаям и участвует в развитии базы знаний.

Backend отвечает за:
- правила;
- пороги уверенности;
- жизненный цикл сущностей;
- аудит;
- статусы;
- хранение данных.

---

## Основная цель

Обновить документацию проекта так, чтобы она описывала:

1. Целевую бизнес-логику Controlled Hybrid.
2. Целевые сценарии клиентского, операторского и административного контуров.
3. Целевую модель данных.
4. Отличия текущей реализации от целевой.
5. Правила миграции к CH.
6. План реализации C1–C7.
7. Правило приёмки: цикл считается завершённым только после акцепта владельцем системы.

---

## Документы для обновления

Минимально:

1. Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
2. IMPLEMENTATION_PLAN.md

README.md обновлять только если текущие формулировки противоречат выбранной архитектуре.

---

## Обязательные дополнения в SOT

### 1. Бизнес-модель Controlled Hybrid

Зафиксировать целевой pipeline:

Входящее обращение
→ нормализация и извлечение признаков
→ поиск типовой ситуации
→ оценка уверенности
→ выбор ветки обработки
→ политика ответа выбранной ситуации
→ LLM-адаптация (если разрешено)
→ публикация или операторская проверка
→ обратная связь в базу знаний

Явно указать:

- Типовая ситуация является SOT бизнес-решения.
- Сценарий / Тональность / Приоритет являются атрибутами типовой ситуации.
- Типовой ответ связан с типовой ситуацией.
- LLM не принимает бизнес-решение.
- Retrieval не публикует ответы самостоятельно.
- Backend принимает решения по правилам и порогам.
- Оператор является финальной инстанцией для спорных случаев.

---

### 2. Целевые UI-контуры

#### Клиентский интерфейс

Сохранить уже акцептированное поведение:

- создание обращения;
- номер обращения формата NL-XXXXXXXX-NNN;
- поиск по номеру и e-mail;
- статусная диаграмма;
- отображение опубликованного ответа;
- отсутствие утечки внутренних идентификаторов и AI-метаданных.

Воздействие CH:

Минимальные изменения.

Большинство изменений остаётся внутри операторского и административного контуров.

---

#### Операторская консоль

Описать сценарии:

1. Очередь обращений.
2. Карточка обращения.
3. Просмотр выбранной типовой ситуации.
4. Просмотр confidence.
5. Просмотр альтернативных кандидатов.
6. Подтверждение ответа.
7. Редактирование ответа.
8. Отклонение.
9. Предложение новой типовой ситуации.
10. Передача обратной связи в базу знаний.

Сохранить уже акцептированное:

- левую очередь;
- правую рабочую область;
- Одобрить и отправить;
- модалку отклонения;
- блокировку действий после публикации;
- жизненный цикл обращения.

---

#### Административный интерфейс

Описать сценарии:

1. Управление типовыми ситуациями.
2. Управление примерами обращений.
3. Управление типовыми ответами.
4. Версионирование.
5. Активация/деактивация.
6. Обработка предложений операторов.
7. Аналитика промахов retrieval.
8. Аналитика неизвестных ситуаций.
9. Аналитика частых исправлений операторов.

Справочники С/Т/П остаются, но используются как атрибуты типовых ситуаций.

---

### 3. Целевая модель данных

Зафиксировать архитектурные сущности:

- response_cases (типовые ситуации);
- response_case_patterns;
- response_case_templates;
- response_case_versions;
- response_case_decisions;
- case_match_results;
- response_case_feedback;
- knowledge_base_change_requests.

Для каждой сущности описать:

- назначение;
- связь с текущими структурами;
- новая или существующая сущность;
- в каком цикле внедряется.

Минимальные связи:

reviews → response_case_decisions

response_case_decisions → response_cases

response_cases → response_case_templates

response_cases → response_case_patterns

response_case_decisions → case_match_results

feedback → response_case_feedback

---

### 4. Разрыв между текущим и целевым состоянием

Текущее:

phrase matching
+
LLM classification
+
template scoring по С/Т/П
+
генерация ответа
+
операторская модерация

Целевое:

поиск типовой ситуации
→ confidence
→ политика типовой ситуации
→ ограниченная LLM-адаптация
→ цикл обратной связи

Явно зафиксировать:

- сущность response_case отсутствует;
- шаблоны выбираются эвристически;
- LLM участвует в бизнес-решении;
- Controlled Hybrid должен устранить эту зависимость.

---

### 5. Циклы реализации

Зафиксировать:

C1 — обновление SOT и архитектуры CH

C2 — фундамент модели данных

C3 — сохранение и регрессия клиентского UI

C4 — операторский контур Controlled Hybrid

C5 — административный контур управления типовыми ситуациями

C6 — переход pipeline на CH

C7 — аудит, аналитика и оценка качества

Для каждого цикла описать:

- цель;
- область работ;
- результаты;
- ограничения;
- критерии завершения.

Ключевое правило:

Любой цикл считается завершённым только после акцепта владельцем системы.

---

### 6. Принципы миграции

Зафиксировать:

1. Сохранять акцептированный клиентский UI.
2. Сохранять акцептированную операторскую консоль.
3. Не ломать существующие сценарии без необходимости.
4. Сначала внедрить типовые ситуации как новый SOT.
5. Избегать разрушительных изменений схемы данных.
6. Сохранять исторические данные.
7. Обеспечить наблюдаемость перехода.
8. Не передавать бизнес-решения исключительно LLM.

---

## Изменения IMPLEMENTATION_PLAN

Добавить раздел:

«Переход на Controlled Hybrid»

Отразить:

- выполнение C1;
- подготовку C2;
- зависимости между циклами;
- порядок внедрения.

Не заявлять будущие циклы как реализованные.

---

## Лог сессии

Создать:

docs/cursor_sessions/2026-05-30_sprint_022b_ch_sot_architecture_update.md

Обязательно включить:

1. FULL PROMPT.
2. Изученные документы.
3. Изменённые документы.
4. Изменения в SOT.
5. Изменения в плане реализации.
6. Изменения README (если были).
7. Что является целевой архитектурой.
8. Что уже реализовано.
9. Риски и неизвестные факторы.
10. Проверочные команды.

---

## Проверка

Выполнить:

git diff --stat

git diff -- Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md IMPLEMENTATION_PLAN.md README.md

Если выполнялись только изменения документации — явно указать это.

---

## Критерии завершения

Задача считается выполненной только если:

1. Controlled Hybrid описан в SOT как целевая архитектура.
2. Типовая ситуация определена как SOT бизнес-решения.
3. Текущая и целевая архитектуры разделены.
4. Описаны клиентский, операторский и административный контуры.
5. Зафиксирована целевая модель данных.
6. Обновлён IMPLEMENTATION_PLAN.
7. Не изменены runtime-компоненты.
8. В логе присутствует FULL PROMPT.
9. Cursor выдал краткий итоговый отчёт.

---

## Ответ Cursor

Кратко сообщить:

Выполнено. C1 завершён.

Изменены документы:
- ...
- ...

Лог:
docs/cursor_sessions/2026-05-30_sprint_022b_ch_sot_architecture_update.md

Изменения кода, БД и UI не выполнялись.
