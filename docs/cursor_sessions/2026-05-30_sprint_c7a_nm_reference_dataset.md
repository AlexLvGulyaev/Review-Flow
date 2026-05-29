# Sprint C7A — NM Reference & SOT Demo Dataset

**Date:** 2026-05-30  
**Status:** Completed  
**Task source:** `cursor_tasks_local/2026-05-30_sprint_c7a_nm_reference_dataset.md`

---

## Summary

Идемпотентный seed NM: 25 клиентов, 50 заказов (`service_cases`), расширенные `review_topics` и `response_cases` с политиками, approved responses и примерами. **Не создавались** `reviews`, `response_case_decisions`, `case_match_results`, кандидаты и искусственная аналитика.

Минимальное изменение ingest: повторное обращение с тем же email и номером заказа переиспользует существующий `service_case` (`pipeline.py`).

---

## Deliverables

| Artifact | Description |
|----------|-------------|
| `backend/migrations/012_nm_reference_dataset.sql` | Idempotent NM dataset |
| `backend/app/services/pipeline.py` | Reuse seeded order on review submit |
| `README.md` | Demo dataset section |

---

## Verification counts (expected after migration)

| Entity | Count |
|--------|------:|
| customers (NM external id) | 25 |
| service_cases (nm_demo orders) | 50 |
| product_areas | 7 |
| review_topics | 19 |
| response_cases | 18 |
| response_case_examples | ~75+ |

Run:

```sql
SELECT COUNT(*) FROM customers WHERE customer_external_id LIKE 'NM-CUST-%';
SELECT COUNT(*) FROM service_cases WHERE metadata->>'nm_demo' = 'true';
SELECT COUNT(*) FROM product_areas WHERE is_active;
SELECT COUNT(*) FROM review_topics WHERE is_active;
SELECT COUNT(*) FROM response_cases WHERE is_active;
SELECT COUNT(*) FROM response_case_examples WHERE source IN ('seed', 'nm_seed_c7a');
```

---

## FULL PROMPT

# Sprint C7A — NM Reference & SOT Demo Dataset

## Тип задачи

Implementation Sprint.

Цель:

создать первичный демонстрационный датасет для Review Flow после завершения Controlled Hybrid.

Важно:

Не создавать историю обращений.

Не создавать review-поток.

Не создавать response_case_decisions.

Не создавать case_match_results.

Не создавать искусственную аналитику.

Датасет должен подготовить систему к реальной эксплуатации и тестированию через клиентский UI.

---

## Перед началом обязательно изучить

1. SOT v4
2. IMPLEMENTATION_PLAN
3. controlled_hybrid_operational_model.md
4. Sprint C2
5. Sprint C5
6. Sprint C7

---

## Главная цель

Подготовить наполненную предметную область NM.

После завершения должны существовать:

- клиенты;
- заказы;
- продуктовые направления;
- темы обращений;
- типовые ситуации;
- примеры типовых ситуаций;
- политики ответов;
- approved responses.

Но не должно существовать заранее сгенерированной истории обращений.

---

## Требование 1. Customers

Создать реалистичный seed:

20–30 клиентов.

Разнообразить:

- имена;
- email;
- сегменты;
- историю взаимодействия.

---

## Требование 2. Service Cases

Создать:

40–60 service_cases.

Каждый service_case должен быть связан с существующим customer.

Использовать реалистичную легенду NM.

---

## Требование 3. Product Areas

Проверить и при необходимости дополнить справочник.

Ориентировочно:

- Доставка
- Качество товара
- Оплата
- Возврат
- Поддержка
- Сайт / приложение
- Общее

Использовать существующую модель данных.

---

## Требование 4. Review Topics

Подготовить реалистичный набор тем.

Темы должны покрывать основные сценарии будущих обращений.

---

## Требование 5. Response Cases

Провести ревизию существующего seed.

При необходимости дополнить.

Цель:

получить реалистичную стартовую базу знаний NM.

---

## Требование 6. Response Case Examples

Для каждого case подготовить несколько качественных примеров обращений.

Примеры должны выглядеть как реальные отзывы клиентов.

---

## Требование 7. Response Policies

Проверить заполненность политик.

Для каждого case должна существовать понятная политика обработки.

---

## Требование 8. Approved Responses

Проверить и дополнить approved responses.

Ответы должны выглядеть как реальные корпоративные ответы NM.

---

## Требование 9. Seed Strategy

Вся загрузка должна быть идемпотентной.

Повторный запуск не должен размножать данные.

---

## Требование 10. Verification

После завершения предоставить:

- количество customers;
- количество service_cases;
- количество product_areas;
- количество review_topics;
- количество response_cases;
- количество examples.

---

## Acceptance Criteria

После завершения:

1. Клиент может создавать новые обращения.
2. Обращения привязываются к существующим заказам.
3. CH имеет стартовую базу знаний.
4. Analytics остаётся пустой до появления реальных обращений.
5. Система готова к ручному тестированию через UI.

---

## Документация

Обновить README при необходимости.

Создать session log:

docs/cursor_sessions/2026-05-30_sprint_c7a_nm_reference_dataset.md

В начало включить FULL PROMPT.

---

## Ожидаемый результат

Review Flow получает реалистичную предметную область NM и стартовую базу знаний без искусственно созданной истории обращений.
