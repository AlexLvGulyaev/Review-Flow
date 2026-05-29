# Sprint C6 — Controlled Hybrid Pipeline Transition

**Date:** 2026-05-30  
**Status:** Completed  
**Task source:** `cursor_tasks_local/2026-05-30_sprint_c6_controlled_hybrid_pipeline_transition.md`

---

## Summary

Runtime pipeline переведён на **Controlled Hybrid** при `CH_PIPELINE_ENABLED=true` (default): retrieval типовых ситуаций → confidence band → `response_case_decisions` + `case_match_results` → draft из `response_policy` / `approved_response_text`. Legacy MVP доступен через `CH_PIPELINE_ENABLED=false`.

---

## Implemented components

| Layer | Module |
|-------|--------|
| Config | `app/core/config.py` — `ch_pipeline_enabled`, `ch_confidence_medium_delta`, `ch_retrieval_top_n` |
| Retrieval | `controlled_hybrid/retrieval.py` — fuzzy match on `response_case_examples` |
| Confidence | `controlled_hybrid/confidence.py` — HIGH / MEDIUM / LOW vs per-case threshold |
| Decisions | `controlled_hybrid/decisions.py` — match results, decisions, feedback |
| CH pipeline | `controlled_hybrid/pipeline.py` |
| Draft | `controlled_hybrid/draft_generation.py` — bounded LLM adaptation |
| Integration | `services/pipeline.py` — branch on flag |
| Operator API | `confirm-case`, `override-case`, `case-candidates` |
| Operator detail | `selected_response_case`, `case_alternatives`, `pipeline_mode` |
| Admin | `GET/POST .../response-case-candidates` |
| Presenter | `controlled_hybrid/presenter.py` — avoid circular imports |

---

## Confidence branches (runtime)

| Band | System behavior |
|------|-----------------|
| **HIGH** | `retrieval_auto` decision, draft generated, `operator_case_confirmed=true` |
| **MEDIUM** | decision + draft, `requires_operator_case_confirmation=true`, approve → 409 until `confirm-case` |
| **LOW** | no `is_current` decision, match_results only, feedback `new_case_needed`, no draft |

---

## Operator endpoints

| Method | Path |
|--------|------|
| POST | `/api/operator/reviews/{id}/confirm-case` |
| POST | `/api/operator/reviews/{id}/override-case` |
| POST | `/api/operator/reviews/{id}/case-candidates` |
| POST | `/api/admin/response-case-candidates/{id}/approve` |

---

## Verification

```bash
python3 -m compileall backend/app -q

curl -s http://localhost:8700/health

# HIGH example (exact seed phrase)
curl -s -X POST http://localhost:8700/api/reviews -H 'Content-Type: application/json' \
  -d '{"customer_name":"Test","email":"ch@ex.com","review_text":"Обещали привезти вчера, но заказ так и не приехал","rating":2,"order_number":"NL-00999002","product_area":"delivery"}'
# → case_match_results: 5, decision: retrieval_auto, confidence 1.0, band high

curl -s -H 'X-Role: operator' http://localhost:8700/api/operator/reviews/{review_id}
# → pipeline_mode: controlled_hybrid, selected_response_case, case_alternatives
```

---

## Not changed

- Client UI
- Operator UI layout (API fields additive only)
- Full C4/C5 admin CRUD UI

---

## Documentation

- SOT §3A — C6 implemented
- IMPLEMENTATION_PLAN — C6 complete
- README — CH pipeline default on
- `.env.example`, `docker-compose.yml` — CH env vars

---

## FULL PROMPT
# Sprint C6 — Controlled Hybrid Pipeline Transition

## Тип задачи

Implementation Sprint.

Цель: перевести систему с текущего MVP pipeline (classification + template selection) на Controlled Hybrid pipeline, используя уже реализованную модель данных C2 и операционную модель Sprint 023.

---

## Перед началом обязательно изучить

1. docs/architecture/controlled_hybrid_operational_model.md
2. Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md (§3A)
3. IMPLEMENTATION_PLAN.md
4. Sprint 022A–022D
5. Sprint 023

---

## Главная цель C6

Заменить источник бизнес-решения.

Было:

Review
→ Phrase Matching
→ LLM Classification
→ Template Selection
→ Draft

Должно стать:

Review
→ Response Case Retrieval
→ Confidence Evaluation
→ Response Case Decision
→ Response Policy
→ Draft Generation
→ Operator

---

## Что реализовать

### 1. Retrieval Layer

Создать сервис поиска Response Case.

Использовать:

- response_cases
- response_case_examples
- product_areas
- review_topics

Результат:

- top candidates;
- score;
- rank.

Заполнять:

case_match_results

---

### 2. Confidence Workflow

Реализовать HIGH / MEDIUM / LOW согласно Sprint 023.

Не хардкодить в UI.

Пороги должны быть конфигурируемыми.

---

### 3. Decision Layer

Реализовать:

response_case_decisions

Фиксировать:

- selected case;
- decision source;
- confidence;
- operator override flag.

---

### 4. Policy Layer

Источником ответа становится:

response_cases.approved_response_text
response_cases.response_policy

Старый template selection больше не является SOT.

---

### 5. Draft Generation

LLM используется только для адаптации ответа.

Запретить свободную генерацию вне policy.

---

### 6. Operator API

Подготовить API для:

- selected case;
- confidence;
- alternatives;
- override.

Даже если UI будет дорабатываться позже.

---

### 7. Feedback Layer

Подготовить:

response_case_feedback

Источники:

- override;
- reject;
- low confidence.

---

## Ограничения

Не ломать:

- клиентский UI;
- NL-номер обращения;
- status workflow;
- approve/reject flow.

Сохранить совместимость с существующими обращениями.

---

## Acceptance

Все Acceptance Criteria из Sprint 023 должны быть выполнены.

Отдельно показать:

1. Как работает HIGH.
2. Как работает MEDIUM.
3. Как работает LOW.
4. Как работает override.
5. Как работает candidate path.

---

## Документация

Обновить:

- SOT;
- IMPLEMENTATION_PLAN;
- README.

Создать session log:

docs/cursor_sessions/2026-05-30_sprint_c6_controlled_hybrid_pipeline_transition.md

В начало включить FULL PROMPT.

---

## Итог

После завершения C6 бизнес-решение должно приниматься через Response Case, а не через классификацию С/Т/П.
