# Sprint 022D — C2 Implementation foundation v2

**Date:** 2026-05-30  
**Status:** Completed  
**Task source:** `cursor_tasks_local/2026-05-30_sprint_022d_c2_implementation_foundation_v2.md`

---

## Summary

Реализован физический фундамент Controlled Hybrid: справочники `product_areas` / `review_topics`, 6 таблиц CH, ORM, Pydantic-схемы, сервис чтения, admin read API, seed (6 cases, 14 examples). **Pipeline, клиентский и операторский UI не изменялись.**

---

## Owner decisions applied

1. CH — целевая архитектура; типовая ситуация = SOT.
2. С/Т/П — атрибуты case.
3. `product_area` и `topic` — **справочники с FK**, не строки.
4. `response_policy` ≠ `approved_response_text`.
5. Примеры — `response_case_examples` (1:N).
6. **Старая KB не мигрируется** — CH seed с нуля.
7. Legacy `review_phrase_patterns` / `response_templates` **оставлены активными** до C6 (деактивация сломала бы MVP template selection).

---

## Migrations

| File | Content |
|------|---------|
| `backend/migrations/011_ch_data_model_foundation.sql` | DDL + seed product_areas (7), review_topics (6), response_cases (6), examples (14) |

Partial unique index: `uq_response_case_decisions_current_review` ON `(review_id) WHERE is_current = TRUE`.

---

## ORM models

`backend/app/models/ch_entities.py`:

- `ProductArea`, `ReviewTopic`
- `ResponseCase`, `ResponseCaseExample`
- `ResponseCaseCandidate`, `ResponseCaseDecision`
- `CaseMatchResult`, `ResponseCaseFeedback`

Registered via `backend/app/models/__init__.py`.

---

## Schemas & service

| File | Purpose |
|------|---------|
| `backend/app/schemas/response_case.py` | `ProductAreaOut`, `ReviewTopicOut`, `ResponseCaseExampleOut`, `ResponseCaseListItem`, `ResponseCaseOut` |
| `backend/app/services/response_cases.py` | `ResponseCaseService` — list/filter/search, get with examples |

---

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/admin/response-cases` | `X-Role: administrator` |
| GET | `/api/admin/response-cases/{id}` | `X-Role: administrator` |

Query params (list): `is_active`, `scenario_id`, `sentiment_id`, `priority_id`, `product_area_id`, `topic_id`, `search`.

Router: `backend/app/api/response_cases_admin.py` (included in `main.py`).

---

## Seed data

| Table | Count |
|-------|-------|
| `product_areas` | 7 |
| `review_topics` | 6 |
| `response_cases` | 6 |
| `response_case_examples` | 14 |

Cases: задержка поставки, статус заказа, благодарность, качество товара, оплата, улучшение сервиса.

---

## Not implemented (by design)

- Runtime pipeline → CH
- Retrieval / `case_match_results` population
- `response_case_decisions` writes
- Candidate workflow UI
- CRUD admin API for cases
- Client / operator UI changes
- C3–C7

---

## Verification

```bash
python3 -m compileall backend/app -q
# exit 0 (host); container rebuild applies code

docker compose exec -T postgres psql -U reviewflow -d reviewflow -c "
SELECT COUNT(*) FROM product_areas;        -- 7
SELECT COUNT(*) FROM review_topics;        -- 6
SELECT COUNT(*) FROM response_cases;       -- 6
SELECT COUNT(*) FROM response_case_examples; -- 14
"

curl -s -H 'X-Role: administrator' http://localhost:8700/api/admin/response-cases
# 200, JSON array of 6 cases with refs

curl -s -H 'X-Role: administrator' http://localhost:8700/api/admin/response-cases/{id}
# 200, includes examples[]
```

Frontend build: **не выполнялся** (UI не менялся).

---

## Changed files (this sprint)

| Path |
|------|
| `backend/migrations/011_ch_data_model_foundation.sql` |
| `backend/app/models/ch_entities.py` |
| `backend/app/models/__init__.py` |
| `backend/app/schemas/response_case.py` |
| `backend/app/services/response_cases.py` |
| `backend/app/api/response_cases_admin.py` |
| `backend/app/main.py` |
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` |
| `IMPLEMENTATION_PLAN.md` |
| `README.md` |
| `docs/cursor_sessions/2026-05-30_sprint_022d_c2_implementation_foundation_v2.md` |

---

## Risks & next steps

| Risk | Mitigation |
|------|------------|
| Две параллельные KB (legacy + CH) | C6 cutover + C5 admin UI |
| Пустые decisions/match tables | Ожидаемо до C6 |

**Next (owner choice):** C3 customer regression, C4/C5 UI, or C6 pipeline.

---

## Documentation updates

- SOT §3A.5 — physical tables, C2 status, product_areas/review_topics, no legacy migration.
- IMPLEMENTATION_PLAN — C2 marked complete.
- README — C2 foundation note; pipeline still MVP.

---

## FULL PROMPT
# Sprint 022D — C2 Implementation v2. Фундамент модели данных Controlled Hybrid

## Тип задачи

Кодовый спринт C2 Implementation.

Разрешено:

- создать миграцию БД;
- добавить ORM-модели;
- добавить Pydantic-схемы;
- добавить backend-сервисы/репозитории для чтения новой модели;
- добавить seed-данные для новой CH-модели;
- добавить admin read API для типовых ситуаций;
- обновить SOT и IMPLEMENTATION_PLAN только по фактически внесённым изменениям;
- создать session log с FULL PROMPT.

Запрещено:

- менять клиентский UI;
- менять операторский UI;
- менять административный UI, кроме возможной навигационной ссылки/read-only страницы, если она уже поддерживается текущим каркасом и не ломает существующие контуры;
- переводить runtime pipeline на CH;
- менять текущую логику обработки обращений;
- внедрять retrieval в runtime pipeline;
- автоматически выбирать response case в pipeline;
- удалять transactional-историю обращений;
- заявлять C3–C7 как реализованные.

---

## Исходные материалы

Перед началом изучить:

1. `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`
2. `docs/cursor_sessions/2026-05-30_sprint_022b_ch_sot_architecture_update.md`
3. `docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md`
4. `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
5. `IMPLEMENTATION_PLAN.md`
6. текущие backend migrations;
7. текущие SQLAlchemy models;
8. текущие API routers;
9. текущие admin/reference API patterns.

---

## Акцепт владельца системы

Владелец системы акцептовал следующие решения:

1. Целевая архитектура — Controlled Hybrid.
2. Типовая ситуация обращения является SOT бизнес-решения.
3. Сценарий / тональность / приоритет являются атрибутами типовой ситуации.
4. Продукт/направление и тема обращения также являются управляемыми справочниками, а не свободными строками.
5. Политика ответа и утверждённый текст ответа — разные поля.
6. Примеры обращений — дочерняя таблица 1:N, а не мультизначное поле.
7. Старую базу знаний можно пересоздать с нуля.
8. Не выполнять сложную миграцию старых кейсов, шаблонов и phrase-patterns.
9. Риски неоднозначной миграции преодолеваются созданием чистой базы типовых ситуаций Controlled Hybrid.

Это означает:

- не нужно пытаться корректно преобразовать все старые `review_phrase_patterns` в новые cases;
- не нужно пытаться корректно преобразовать все старые `response_templates` в новые cases;
- допустимо удалить/деактивировать старые seed/demo rows базы знаний, если это не ломает текущий запуск до C6;
- transactional history (`reviews`, `review_responses`, `customers`, `service_cases`, `operational_logs`) сохраняется;
- справочники С/Т/П сохраняются;
- новая CH-модель создаётся как чистый фундамент.

---

## Цель спринта

Реализовать фундамент физической модели данных Controlled Hybrid без переключения pipeline.

После спринта в проекте должны существовать:

1. Справочники `product_areas` и `review_topics`.
2. Таблицы CH.
3. ORM-модели CH.
4. Pydantic-схемы CH.
5. Минимальный сервис/репозиторий чтения CH-модели.
6. Admin read API для просмотра типовых ситуаций и связанных примеров.
7. Seed-данные для нескольких типовых ситуаций.
8. Документация, отражающая факт реализации C2.

---

## Новые структуры данных

Создать следующие таблицы:

1. `product_areas`
2. `review_topics`
3. `response_cases`
4. `response_case_examples`
5. `response_case_candidates`
6. `response_case_decisions`
7. `case_match_results`
8. `response_case_feedback`

---

# 1. Таблица product_areas

Бизнес-семантика:

```text
Справочник продуктов, услуг или направлений бизнеса,
к которым может относиться типовая ситуация обращения.
```

Это НСИ. Не хранить как свободную строку в `response_cases`.

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор направления | `...` |
| `code` | VARCHAR, UNIQUE, NOT NULL | Стабильный код направления | `delivery` |
| `name` | VARCHAR, NOT NULL | Человекочитаемое название | `Доставка` |
| `description` | TEXT, nullable | Описание направления | `Вопросы доставки и поставки заказов` |
| `is_active` | BOOLEAN, default true | Используется ли направление | `true` |
| `created_at` | TIMESTAMPTZ | Дата создания | `2026-05-30 19:32:00` |
| `updated_at` | TIMESTAMPTZ | Дата изменения | `2026-05-30 19:32:00` |

Seed examples:

- `delivery` / `Доставка`
- `product_quality` / `Качество товара`
- `payment` / `Оплата`
- `return` / `Возврат`
- `support` / `Поддержка`
- `digital` / `Сайт / приложение`
- `general` / `Общее`

---

# 2. Таблица review_topics

Бизнес-семантика:

```text
Справочник узких тем обращения внутри продукта/направления.
```

Это НСИ. Не хранить как свободную строку в `response_cases`.

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор темы | `...` |
| `code` | VARCHAR, UNIQUE, NOT NULL | Стабильный код темы | `delivery_delay` |
| `name` | VARCHAR, NOT NULL | Человекочитаемое название | `Нарушение сроков поставки` |
| `description` | TEXT, nullable | Описание темы | `Клиент сообщает, что заказ доставлен позже обещанного срока` |
| `product_area_id` | UUID, FK nullable → `product_areas.id` | Связь темы с направлением | `Доставка` |
| `is_active` | BOOLEAN, default true | Используется ли тема | `true` |
| `created_at` | TIMESTAMPTZ | Дата создания | `2026-05-30 19:33:00` |
| `updated_at` | TIMESTAMPTZ | Дата изменения | `2026-05-30 19:33:00` |

Seed examples:

- `delivery_delay` / `Нарушение сроков поставки` / `delivery`
- `order_status` / `Статус заказа` / `delivery`
- `employee_gratitude` / `Благодарность сотруднику` / `support`
- `product_defect` / `Недостаток товара` / `product_quality`
- `payment_question` / `Вопрос по оплате` / `payment`
- `service_improvement` / `Предложение улучшения сервиса` / `general`

---

# 3. Таблица response_cases

Бизнес-семантика:

```text
Типовая ситуация обращения.
Главный SOT бизнес-решения Controlled Hybrid.
```

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор типовой ситуации | `...` |
| `case_code` | VARCHAR, UNIQUE, NOT NULL | Стабильный код типовой ситуации | `delivery_delay_confirmed_order` |
| `title` | VARCHAR, NOT NULL | Название типовой ситуации | `Задержка поставки подтверждённого заказа` |
| `description` | TEXT, nullable | Описание условий применения | `Клиент сообщает о задержке уже подтверждённой поставки` |
| `scenario_id` | UUID, FK → `interaction_scenarios.id` | Сценарий как атрибут ситуации | `Жалоба` |
| `sentiment_id` | UUID, FK → `sentiment_profiles.id` | Тональность как атрибут ситуации | `Негативная` |
| `priority_id` | UUID, FK → `priority_levels.id` | Приоритет как атрибут ситуации | `Высокий` |
| `product_area_id` | UUID, FK → `product_areas.id` | Продукт / услуга / направление | `Доставка` |
| `topic_id` | UUID, FK → `review_topics.id` | Узкая тема обращения | `Нарушение сроков поставки` |
| `response_policy` | TEXT, NOT NULL | Правила подготовки ответа | `Извиниться. Не обещать компенсацию. Уточнить статус.` |
| `approved_response_text` | TEXT, NOT NULL | Утверждённая текстовая основа ответа | `Здравствуйте! Приносим извинения за задержку...` |
| `confidence_threshold` | NUMERIC(5,4), NOT NULL default 0.75 | Минимальная уверенность для выбора ситуации | `0.85` |
| `review_policy` | VARCHAR, NOT NULL default `operator_required` | Порядок согласования | `operator_required` |
| `is_active` | BOOLEAN, default true | Используется ли ситуация | `true` |
| `created_by` | VARCHAR, nullable | Источник создания | `seed` |
| `created_at` | TIMESTAMPTZ | Дата создания | `2026-05-30 19:30:00` |
| `updated_at` | TIMESTAMPTZ | Дата изменения | `2026-05-30 19:45:00` |

Требования:

- `response_policy` и `approved_response_text` — разные поля.
- `product_area_id` и `topic_id` — FK, не строки.
- Не добавлять `match_examples` в `response_cases`.
- Примеры обращений хранятся только в дочерней таблице.
- С/Т/П — атрибуты case, не SOT выбора ответа.

Допустимые значения `review_policy`:

- `operator_required`
- `auto_draft_if_confident`
- `auto_publish_if_confident`

На C2 runtime pipeline не использует эти значения.

---

# 4. Таблица response_case_examples

Бизнес-семантика:

```text
Примеры реальных или искусственно подготовленных обращений,
по которым система должна распознавать типовую ситуацию.
```

Связь:

```text
response_cases 1 → N response_case_examples
```

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор примера | `...` |
| `response_case_id` | UUID, FK → `response_cases.id` | Ссылка на типовую ситуацию | `delivery_delay_confirmed_order` |
| `example_text` | TEXT, NOT NULL | Текст примера обращения | `Обещали привезти вчера, но заказ не приехал` |
| `source` | VARCHAR, NOT NULL | Источник примера | `seed` |
| `source_review_id` | UUID, FK nullable → `reviews.id` | Ссылка на реальное обращение, если пример взят из него | `review_id` |
| `legacy_phrase_pattern_id` | UUID, nullable | Ссылка на старую формулировку, если сохраняем трассировку | `old_phrase_id` |
| `is_active` | BOOLEAN, default true | Используется ли пример для поиска | `true` |
| `created_at` | TIMESTAMPTZ | Дата создания | `2026-05-30 19:31:00` |
| `updated_at` | TIMESTAMPTZ | Дата изменения | `2026-05-30 19:31:00` |

Допустимые значения `source`:

- `admin_manual`
- `seed`
- `from_review`
- `operator_proposal`
- `legacy_trace`

---

# 5. Таблица response_case_candidates

Бизнес-семантика:

```text
Кандидат на новую типовую ситуацию,
созданный из обращения с низкой уверенностью или отсутствием подходящего case.
```

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор кандидата | `...` |
| `review_id` | UUID, FK → `reviews.id` | Обращение, из которого возник кандидат | `review_id` |
| `status` | VARCHAR, NOT NULL | Статус рассмотрения кандидата | `pending_admin` |
| `proposed_title` | VARCHAR, nullable | Предложенное название ситуации | `Задержка поставки из-за таможни` |
| `proposed_description` | TEXT, nullable | Предложенное описание | `Клиент сообщает о задержке поставки из-за прохождения таможни` |
| `proposed_scenario_id` | UUID, FK nullable → `interaction_scenarios.id` | Предлагаемый сценарий | `Жалоба` |
| `proposed_sentiment_id` | UUID, FK nullable → `sentiment_profiles.id` | Предлагаемая тональность | `Негативная` |
| `proposed_priority_id` | UUID, FK nullable → `priority_levels.id` | Предлагаемый приоритет | `Высокий` |
| `proposed_product_area_id` | UUID, FK nullable → `product_areas.id` | Предлагаемое направление | `Доставка` |
| `proposed_topic_id` | UUID, FK nullable → `review_topics.id` | Предлагаемая тема | `Задержка на таможне` |
| `proposed_response_policy` | TEXT, nullable | Черновик правил ответа | `Извиниться. Уточнить этап прохождения таможни.` |
| `proposed_approved_response_text` | TEXT, nullable | Черновик типового ответа | `Здравствуйте! Поставка задерживается на этапе таможенного оформления...` |
| `proposed_by_operator_id` | VARCHAR, nullable | Кто предложил кандидата | `operator_01` |
| `reviewed_by_admin_id` | VARCHAR, nullable | Кто рассмотрел кандидата | `admin_01` |
| `promoted_response_case_id` | UUID, FK nullable → `response_cases.id` | В какую типовую ситуацию превращён кандидат | `response_case_id` |
| `merged_into_case_id` | UUID, FK nullable → `response_cases.id` | С какой существующей ситуацией объединён | `delivery_delay_confirmed_order` |
| `rejection_comment` | TEXT, nullable | Причина отклонения | `Дублирует существующую ситуацию` |
| `created_at` | TIMESTAMPTZ | Дата создания | `2026-05-30 19:34:00` |
| `updated_at` | TIMESTAMPTZ | Дата изменения | `2026-05-30 19:50:00` |

Допустимые значения `status`:

- `pending_operator`
- `pending_admin`
- `approved`
- `rejected`
- `merged`

На C2 таблица создаётся, но UI/workflow кандидатов не реализуется.

---

# 6. Таблица response_case_decisions

Бизнес-семантика:

```text
Какую типовую ситуацию система или оператор выбрали для конкретного обращения.
```

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор решения | `...` |
| `review_id` | UUID, FK → `reviews.id` | Обращение | `review_id` |
| `response_case_id` | UUID, FK → `response_cases.id` | Выбранная типовая ситуация | `delivery_delay_confirmed_order` |
| `decision_source` | VARCHAR, NOT NULL | Источник решения | `retrieval_auto` |
| `match_confidence` | NUMERIC(5,4), nullable | Уверенность выбора | `0.87` |
| `is_operator_override` | BOOLEAN, default false | Было ли решение изменено оператором | `false` |
| `legacy_classification_id` | UUID, FK nullable → `review_classifications.id` | Связь со старой классификацией | `classification_id` |
| `is_current` | BOOLEAN, default true | Является ли решение актуальным | `true` |
| `selected_at` | TIMESTAMPTZ, nullable | Когда выбрана ситуация | `2026-05-30 19:35:00` |
| `created_at` | TIMESTAMPTZ | Когда создана запись | `2026-05-30 19:35:00` |

Допустимые значения `decision_source`:

- `retrieval_auto`
- `retrieval_operator`
- `operator_override`
- `admin_override`
- `legacy_migration`
- `manual_seed`

Требование:

- предусмотреть, что для одного review может быть только одно актуальное решение (`is_current = true`).
- можно использовать partial unique index, если совместимо с текущей миграционной практикой проекта.

На C2 pipeline не заполняет decisions автоматически.

---

# 7. Таблица case_match_results

Бизнес-семантика:

```text
Результаты поиска типовой ситуации:
какие case были найдены кандидатами и с каким score.
```

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор результата поиска | `...` |
| `review_id` | UUID, FK → `reviews.id` | Обращение, для которого выполнялся поиск | `review_id` |
| `response_case_id` | UUID, FK → `response_cases.id` | Найденная типовая ситуация-кандидат | `delivery_delay_confirmed_order` |
| `response_case_decision_id` | UUID, FK nullable → `response_case_decisions.id` | Связь с итоговым решением | `decision_id` |
| `match_score` | NUMERIC(5,4), NOT NULL | Оценка похожести / уверенности | `0.87` |
| `rank` | INTEGER, NOT NULL | Место кандидата в выдаче | `1` |
| `match_method` | VARCHAR, NOT NULL | Метод поиска | `example_fuzzy` |
| `is_selected` | BOOLEAN, default false | Был ли этот кандидат выбран итоговым | `true` |
| `created_at` | TIMESTAMPTZ | Дата создания результата | `2026-05-30 19:35:00` |

Допустимые значения `match_method`:

- `example_fuzzy`
- `manual_operator`
- `seed`
- `embedding_future`

На C2 таблица создаётся, но заполняться начнёт только в C6.

---

# 8. Таблица response_case_feedback

Бизнес-семантика:

```text
Обратная связь оператора о неверной типовой ситуации,
неверной политике или неподходящем тексте ответа.
```

| Наименование | Тип | Назначение поля | Пример |
|---|---|---|---|
| `id` | UUID, PK | Уникальный идентификатор обратной связи | `...` |
| `review_id` | UUID, FK → `reviews.id` | Обращение, по которому дана обратная связь | `review_id` |
| `response_case_id` | UUID, FK nullable → `response_cases.id` | Типовая ситуация, по которой дана обратная связь | `delivery_delay_confirmed_order` |
| `response_case_decision_id` | UUID, FK nullable → `response_case_decisions.id` | Решение, с которым связана обратная связь | `decision_id` |
| `feedback_type` | VARCHAR, NOT NULL | Тип замечания | `wrong_case` |
| `rejection_reason` | VARCHAR, nullable | Причина отклонения из текущей модалки | `unsuitable_template` |
| `operator_id` | VARCHAR, nullable | Кто оставил обратную связь | `operator_01` |
| `comment` | TEXT, nullable | Комментарий оператора | `Ситуация похожа, но проблема не в доставке, а в комплектации` |
| `suggested_case_id` | UUID, FK nullable → `response_cases.id` | Какую ситуацию оператор считает правильной | `wrong_item_delivered` |
| `legacy_rejection_feedback_id` | UUID, nullable | Связь со старой записью отклонения | `old_feedback_id` |
| `created_at` | TIMESTAMPTZ | Дата создания обратной связи | `2026-05-30 19:36:00` |

Допустимые значения `feedback_type`:

- `wrong_case`
- `wrong_policy`
- `wrong_response_text`
- `classification_error`
- `new_case_needed`

На C2 не менять текущую модалку отклонения.

---

## Очистка старой базы знаний

С учётом решения владельца:

Разрешено очистить или деактивировать старые demo/seed данные в:

- `review_phrase_patterns`
- `response_templates`

Не удалять сами таблицы на C2.

Причина:

- текущий pipeline всё ещё может ссылаться на legacy-таблицы до C6;
- таблицы нужны для безопасного переходного периода;
- удаление таблиц — не задача C2.

Стратегия:

1. Сохранить таблицы.
2. Удалить или деактивировать старые seed/demo rows только если это не ломает текущий запуск.
3. Если удаление ломает smoke-тест текущего pipeline, использовать деактивацию или оставить fallback seed до C6.
4. В session log явно указать выбранный вариант.

---

## Seed-данные CH

Добавить минимальные seed-данные для:

- `product_areas`;
- `review_topics`;
- `response_cases`;
- `response_case_examples`.

Минимально 4–6 типовых ситуаций:

1. Задержка поставки подтверждённого заказа.
2. Вопрос о статусе заказа.
3. Благодарность сотруднику.
4. Жалоба на качество товара.
5. Вопрос по оплате.
6. Предложение улучшения сервиса.

Для каждой:

- title;
- description;
- scenario_id;
- sentiment_id;
- priority_id;
- product_area_id;
- topic_id;
- response_policy;
- approved_response_text;
- confidence_threshold;
- review_policy;
- 2–4 examples.

Seed должен использовать реальные FK из справочников.

Не хардкодить UUID, если в проекте уже есть безопасные способы lookup по business code.

---

## ORM / Backend

Добавить SQLAlchemy-модели для новых таблиц в стиле существующего проекта.

Добавить relationships, если это соответствует стилю текущих entities.

Добавить Pydantic-схемы для чтения:

- `ProductAreaOut`
- `ReviewTopicOut`
- `ResponseCaseOut`
- `ResponseCaseExampleOut`
- `ResponseCaseListItem`
- при необходимости вложенные ref objects для scenario/sentiment/priority/product_area/topic.

Добавить сервис или repository для чтения active response cases.

---

## Admin read API

Добавить минимальные read-only endpoints:

```text
GET /api/admin/response-cases
GET /api/admin/response-cases/{id}
```

Требования:

- роль administrator;
- список active/inactive cases;
- включить scenario/sentiment/priority/product_area/topic как ref objects;
- включить examples в detail endpoint;
- не делать create/update/delete на C2, если это увеличивает риск.

Допускается добавить query params:

- `is_active`
- `scenario_id`
- `sentiment_id`
- `priority_id`
- `product_area_id`
- `topic_id`
- `search`

только если это просто и соответствует текущему стилю API.

---

## Документация

Обновить:

1. SOT:
   - указать, что C2 реализовал физический фундамент CH;
   - зафиксировать таблицы;
   - зафиксировать, что `product_area` и `topic` являются справочниками/FK;
   - зафиксировать решение владельца: старая база знаний пересоздаётся, неоднозначная миграция не выполняется.

2. IMPLEMENTATION_PLAN:
   - отметить C2 Implementation как выполненный после реализации;
   - C3–C7 оставить не реализованными;
   - указать следующий шаг: C6 pipeline или C4/C5 UI только после акцепта владельца.

README обновлять только если текущий текст стал вводить в заблуждение.

---

## Проверка

Выполнить:

```bash
python3 -m compileall backend/app -q
```

Если frontend build не требуется, так как UI не меняется — явно указать.

Проверить миграции / БД согласно текущей практике проекта.

Минимально выполнить SQL-проверки:

```sql
SELECT COUNT(*) FROM product_areas;
SELECT COUNT(*) FROM review_topics;
SELECT COUNT(*) FROM response_cases;
SELECT COUNT(*) FROM response_case_examples;
SELECT title, review_policy, is_active FROM response_cases ORDER BY title;
```

Проверить API:

```bash
curl -H 'X-Role: administrator' http://localhost:<actual_port>/api/admin/response-cases
```

Использовать фактический порт проекта.

---

## Session log

Создать:

```text
docs/cursor_sessions/2026-05-30_sprint_022d_c2_implementation_foundation_v2.md
```

Лог должен содержать:

1. FULL PROMPT.
2. Что было реализовано.
3. Миграции.
4. ORM-модели.
5. API endpoints.
6. Seed-данные.
7. Что НЕ реализовано.
8. Решение владельца о пересоздании базы знаний.
9. Решение о переводе product_area/topic в справочники.
10. Проверочные команды и результаты.
11. Изменённые файлы.
12. Риски и дальнейшие шаги.

---

## Критерии завершения

Задача считается выполненной только если:

1. Созданы справочники `product_areas` и `review_topics`.
2. `response_cases.product_area_id` и `response_cases.topic_id` являются FK.
3. `response_case_candidates.proposed_product_area_id` и `proposed_topic_id` являются FK.
4. Созданы CH-таблицы.
5. Созданы ORM-модели.
6. Созданы read-схемы.
7. Добавлен admin read API.
8. Добавлены seed product areas, topics, response cases, examples.
9. Старая база знаний очищена/деактивирована или явно обосновано, почему оставлена до C6.
10. Pipeline не переведён на CH.
11. UI не изменён.
12. Клиентский и операторский контуры не сломаны.
13. SOT и IMPLEMENTATION_PLAN обновлены только по факту реализации.
14. Session log содержит FULL PROMPT.
15. Проверки выполнены и результаты указаны.

---

## Ответ Cursor

Кратко сообщить:

```text
Выполнено. C2 Implementation foundation v2 завершён.

Реализовано:
- product_areas / review_topics;
- CH-таблицы;
- ORM-модели;
- seed response cases/examples;
- admin read API.

Не изменялось:
- клиентский UI;
- операторский UI;
- runtime pipeline.

Лог:
docs/cursor_sessions/2026-05-30_sprint_022d_c2_implementation_foundation_v2.md
```
