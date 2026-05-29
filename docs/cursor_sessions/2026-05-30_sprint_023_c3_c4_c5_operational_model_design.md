# Sprint 023 — C3+C4+C5 Operational model design

**Date:** 2026-05-30  
**Status:** Completed (documentation only)  
**Task source:** `cursor_tasks_local/2026-05-30_sprint_023_c3_c4_c5_operational_model_design_v2.md`

---

## Executive summary

Создан нормативный документ операционной модели Controlled Hybrid: customer / operator / admin journeys, confidence и override workflows, candidate lifecycle, feedback loop, две state machines, матрица противоречий as-is UI, **Acceptance Criteria для C6** (25+ проверяемых пунктов).

**Код, БД, pipeline, UI не изменялись.**

---

## Deliverable

| Artifact | Path |
|----------|------|
| Operational model (SOT-level) | `docs/architecture/controlled_hybrid_operational_model.md` |

---

## Document sections

1. Роли: клиент → обращение; оператор → case; админ → база cases  
2. Customer Journey (C3) — полный путь, инварианты, запрет полей case в API  
3. Operator Journey (C4) — карточка 6 блоков, действия O1–O8, ветки  
4. Confidence Workflow — HIGH / MEDIUM / LOW относительно `confidence_threshold`  
5. Override Workflow — lifecycle, feedback, regen draft  
6. Candidate Workflow — operator create → admin approve/merge/reject  
7. Admin Journey (C5) — WF-A…E, навигация  
8. Feedback Loop — источники → feedback → admin KB actions  
9. Review State Machine — 10 состояний + диаграмма  
10. Response Case State Machine — draft/active/inactive  
11. Противоречия UI (10 пунктов)  
12. Открытые вопросы Q1–Q5  
13. **C6 Acceptance Criteria** — P/C/O/K/X/L groups  
14. Рекомендуемый порядок: C6 → C4 → C5 → C3 → C7  

---

## Key design decisions

| Topic | Decision |
|-------|----------|
| Client UX | Без изменений; case/confidence не в customer API |
| Operator role | Подтверждение case, не классификатор С/Т/П |
| Confidence | Относительные band к per-case threshold, не фиксированные % |
| LOW | Approve blocked until case chosen or candidate promoted |
| Legacy KB | Остаётся до C6; admin deprecation banner в C5 |
| Reject modal | Эволюция к case-feedback; dual-write rejection_feedback в C6 (рекомендация) |

---

## Legacy KB (Sprint 022D)

Старая KB **не деактивирована** в этом спринте (документация только). Operational model фиксирует cutover в C6.

---

## Documentation updates

| File | Change |
|------|--------|
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | §3A статус 023; §3A.3.1 ссылка; циклы C3–C6 |
| `IMPLEMENTATION_PLAN.md` | C3–C5 спроектированы; C6 ready; секция Sprint 023 |
| `README.md` | Ссылка на operational model |

---

## Verification

```bash
git status --short
# Expected: only docs changes + session log
```

No `compileall` / docker required (no code).

---

## Next step

**Акцепт владельца** `controlled_hybrid_operational_model.md` → Sprint **C6** (pipeline по §13 AC).

---

## FULL PROMPT
# Sprint 023 — C3+C4+C5. Проектирование операционной модели Controlled Hybrid

## Тип задачи

Документационный спринт уровня архитектуры и продукта.

Цель спринта — НЕ писать код и НЕ реализовывать C6.

Цель спринта — завершить проектирование пользовательской и операционной модели Controlled Hybrid, чтобы последующий C6 стал реализацией уже принятых решений, а не архитектурным исследованием.

---

# Контекст

C1 завершён.

Зафиксировано:

- Controlled Hybrid является целевой архитектурой.
- Response Case является Source of Truth бизнес-решения.
- Сценарий, тональность и приоритет являются атрибутами Response Case.
- LLM не принимает бизнес-решение.

C2 завершён.

Уже существуют:

- product_areas
- review_topics
- response_cases
- response_case_examples
- response_case_candidates
- response_case_decisions
- case_match_results
- response_case_feedback

Pipeline пока работает по старой модели.

Переход на CH ещё не реализован.

---

# Архитектурная позиция (обязательна к использованию)

## Главный принцип

Клиент работает с обращением.

Оператор работает с типовой ситуацией.

Администратор работает с базой типовых ситуаций.

---

# Customer Journey (зафиксированное решение)

Переход на CH не должен менять клиентский UX.

Сохраняются:

- создание обращения;
- номер обращения NL-XXXXXXXX-NNN;
- поиск по номеру и e-mail;
- status page;
- status dialog;
- stepper;
- опубликованный ответ.

Клиент НЕ видит:

- response_case;
- confidence;
- кандидатов;
- операторские решения;
- внутренние классификации;
- служебные идентификаторы.

Требуется подробно описать полный customer journey.

---

# Operator Journey (зафиксированное направление)

Оператор перестаёт быть классификатором.

Основная задача оператора:

подтвердить или скорректировать выбранную системой типовую ситуацию.

Карточка обращения должна содержать:

1. Данные обращения.
2. Найденный response_case.
3. Confidence.
4. Альтернативные response_cases.
5. Policy.
6. Approved response.
7. Draft response.

Требуется детально описать:

- все действия оператора;
- все решения оператора;
- все ветки обработки.

---

# Confidence Workflow (зафиксированное направление)

Необходимо спроектировать три уровня:

1. Высокая уверенность.
2. Средняя уверенность.
3. Низкая уверенность.

Для каждого уровня определить:

- действия системы;
- действия оператора;
- создаваемые записи аудита.

Не привязываться к конкретным цифрам.

---

# Override Workflow (зафиксированное направление)

Если оператор не согласен с системой:

- он может выбрать другой response_case;
- он может изменить ответ;
- он может отказаться от всех предложенных вариантов.

Все подобные действия должны участвовать в feedback loop.

Требуется полностью описать lifecycle override.

---

# Candidate Workflow (зафиксированное направление)

Если подходящий response_case отсутствует:

оператор создаёт response_case_candidate.

Candidate должен содержать:

- название;
- описание;
- пример обращения;
- комментарий оператора.

Администратор может:

- создать новый response_case;
- объединить candidate с существующим case;
- отклонить candidate.

Требуется полностью описать lifecycle candidate.

---

# Admin Journey (зафиксированное направление)

Администратор управляет:

- response_cases;
- response_case_examples;
- response_policy;
- approved_response_text;
- response_case_candidates.

Требуется подробно описать:

- рабочие процессы;
- основные операции;
- жизненный цикл знаний.

---

# Feedback Loop (зафиксированное направление)

Источники развития базы знаний:

- operator override;
- candidate creation;
- частые ошибки confidence;
- частые ручные исправления;
- отклонения response case.

Требуется описать полный цикл развития базы знаний.

---

# State Machine обращения

Требуется создать полноценную state machine.

Не ограничиваться текущими статусами.

Показать:

- состояния;
- переходы;
- действия системы;
- действия оператора.

Использовать текстовые диаграммы.

---

# State Machine Response Case

Требуется создать полноценный lifecycle:

- создание;
- активация;
- редактирование;
- архивирование;
- повторная активация.

Использовать текстовые диаграммы.

---

# Acceptance Criteria для C6

Самый важный раздел документа.

После его прочтения должно быть однозначно понятно:

что именно должен реализовать Sprint C6.

Acceptance Criteria должны быть пригодны для прямой постановки реализации.

---

# Что должен сделать Cursor

1. Создать документ:

docs/architecture/controlled_hybrid_operational_model.md

2. Используя все решения выше, разработать полный документ уровня SOT.

3. Найти противоречия между текущим UI и целевой моделью.

4. Предложить уточнения только там, где решений действительно не хватает.

5. Обновить:

- SOT;
- IMPLEMENTATION_PLAN;
- README;

только ссылками и статусами.

6. Создать session log:

docs/cursor_sessions/2026-05-30_sprint_023_c3_c4_c5_operational_model_design.md

с FULL PROMPT и итоговым отчётом.

---

# Запрещено

- писать код;
- менять БД;
- менять pipeline;
- создавать новые таблицы;
- реализовывать retrieval;
- реализовывать C6.

---

# Ожидаемый результат

В проекте появляется полноценная операционная модель Controlled Hybrid.

После её утверждения можно переходить к Sprint C6.
