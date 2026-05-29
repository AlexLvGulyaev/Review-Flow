# Sprint C7 — Controlled Hybrid Audit, Analytics & Quality

**Date:** 2026-05-30  
**Status:** Completed  
**Task source:** `cursor_tasks_local/2026-05-30_sprint_c7_controlled_hybrid_audit_analytics_quality.md`

---

## Summary

Реализована наблюдаемость Controlled Hybrid для владельца системы: агрегирующий API и консоль качества `/admin/ch-quality` (overview, confidence, override/candidate stats, качество cases, retrieval misses, KB health, audit trail). Pipeline, retrieval, operator workflow и customer UI не изменялись.

---

## Backend

| File | Purpose |
|------|---------|
| `schemas/ch_analytics.py` | DTO dashboard + audit |
| `services/ch_analytics.py` | Агрегации из `response_case_*`, `operational_logs`, `review_responses` |
| `api/ch_analytics.py` | `GET /api/admin/ch-analytics/dashboard`, `GET .../audit` |

---

## Frontend

| File | Purpose |
|------|---------|
| `ops/ch/ChQualityWorkspace.jsx` | Вкладки: Обзор, Confidence, Cases, Промахи, Аудит |
| `pages/admin/AdminChQualityPage.jsx` | Route wrapper |
| Nav: **Наблюдаемость → Качество CH** | `/admin/ch-quality` |

---

## API

- `GET /api/admin/ch-analytics/dashboard?days=30&product_area_id=&topic_id=`
- `GET /api/admin/ch-analytics/audit?days=30&limit=100`

---

## Acceptance criteria

| # | Критерий | Статус |
|---|----------|--------|
| 1 | Распределение confidence | ✓ |
| 2 | Статистика override | ✓ |
| 3 | Статистика candidates | ✓ |
| 4 | Качество отдельных cases | ✓ (problem_score) |
| 5 | Retrieval misses | ✓ |
| 6 | Health базы знаний | ✓ |
| 7 | Аудит ключевых событий CH | ✓ |
| 8 | Проблемные зоны KB | ✓ (by area/topic, case table) |

---

## FULL PROMPT

# Sprint C7 — Controlled Hybrid Audit, Analytics & Quality

## Тип задачи

Implementation Sprint.

Цель:

завершить переход на Controlled Hybrid за счёт внедрения наблюдаемости, аналитики качества и механизмов развития базы знаний.

Важно:

- C1, C2, C4, C5 и C6 уже реализованы.
- Не изменять CH pipeline.
- Не изменять retrieval logic.
- Не изменять operator workflow.
- Не изменять customer UI.
- Использовать существующие сущности CH.

---

## Перед началом обязательно изучить

1. docs/architecture/controlled_hybrid_operational_model.md
2. Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md (§3A)
3. IMPLEMENTATION_PLAN.md
4. Sprint C6 session log
5. Sprint C4 session log
6. Sprint C5 session log

---

## Главная цель

После C6 система умеет принимать решения через Response Case.

После C4 оператор работает с Response Case.

После C5 администратор управляет базой знаний.

Но владелец системы пока не видит:

- качество retrieval;
- качество confidence;
- частоту override;
- проблемные cases;
- эффективность базы знаний;
- динамику развития CH.

C7 должен закрыть этот разрыв.

---

## Требование 1. CH Analytics Dashboard

Создать отдельный раздел аналитики CH.

Отображать:

- total decisions;
- total matched cases;
- total low-confidence cases;
- total overrides;
- total candidates;
- approved candidates;
- rejected candidates.

---

## Требование 2. Confidence Analytics

Показывать распределение:

- HIGH;
- MEDIUM;
- LOW.

Поддержать агрегирование:

- за период;
- по product area;
- по topic.

---

## Требование 3. Override Analytics

Показывать:

- количество override;
- процент override;
- наиболее часто переопределяемые cases;
- причины override (если доступны).

---

## Требование 4. Candidate Analytics

Показывать:

- созданные candidates;
- кандидаты по статусам;
- кандидаты по продуктам;
- кандидаты по темам.

---

## Требование 5. Response Case Quality

Для каждого case отображать:

- количество срабатываний;
- количество override;
- количество feedback;
- количество связанных candidates.

Поддержать сортировку по проблемности.

---

## Требование 6. Retrieval Misses

Реализовать отдельное представление:

Unknown / Missed Cases.

Отображать:

- low confidence;
- candidate creation;
- отсутствие совпадений.

---

## Требование 7. Knowledge Base Health

Показатели здоровья базы знаний:

- активные cases;
- архивные cases;
- coverage;
- candidate backlog;
- approval rate.

---

## Требование 8. Audit Trail

Добавить аудит CH событий.

Отображать:

- case selected;
- case confirmed;
- case overridden;
- candidate created;
- candidate approved;
- candidate rejected.

Использовать существующие события и таблицы.

---

## Требование 9. Admin UX

Использовать существующий Admin UI.

Не создавать отдельное приложение.

Встраивать аналитику в текущий административный контур.

---

## Требование 10. Quality Console

Создать отдельную страницу качества CH.

Владелец системы должен быстро понимать:

- где retrieval работает хорошо;
- где retrieval работает плохо;
- какие cases требуют внимания;
- где развивается новая предметная область.

---

## Acceptance Criteria

Администратор может:

1. Видеть распределение confidence.
2. Видеть статистику override.
3. Видеть статистику candidates.
4. Видеть качество отдельных cases.
5. Видеть retrieval misses.
6. Видеть health базы знаний.
7. Видеть аудит ключевых событий CH.
8. Определять проблемные зоны базы знаний.

---

## Документация

Обновить:

- SOT;
- IMPLEMENTATION_PLAN;
- README.

Только в части статуса реализации.

Создать session log:

docs/cursor_sessions/2026-05-30_sprint_c7_controlled_hybrid_audit_analytics_quality.md

В начало включить FULL PROMPT.

---

## Ожидаемый результат

Владелец системы получает полноценную наблюдаемость Controlled Hybrid и инструменты для развития базы знаний на основе фактической эксплуатации.
