# Sprint 021A — Normalize Classification Reference Data (FK)

**Date:** 2026-05-29  
**Status:** Completed

---

## Root cause

Scenario, sentiment, and priority were stored as free VARCHAR codes on working tables (`review_phrase_patterns`, `response_templates`, `review_classifications`, `rejection_feedback`). That bypasses referential integrity, allows garbage strings, duplicates dictionary logic in the UI, and contradicts the NSI/reference-data model in SOT.

## Migration design

- **Strategy:** add `priority_levels`; add nullable FK columns; backfill from legacy string codes; sync deprecated string mirrors on write; keep legacy columns (not dropped) for safe rollback.
- **Idempotency:** `IF NOT EXISTS`, `ON CONFLICT DO UPDATE` for seed rows.
- **Legacy policy:** string columns (`scenario`, `sentiment`, `priority`, `priority_hint`, `llm_*`, `operator_corrected_*`) remain in DB but runtime reads/writes use `*_id` only; strings updated via `ClassificationRefsService.sync_*_legacy()` on write.

**Files:** `backend/migrations/010_classification_reference_fk.sql`, mirror `infra/db/migrations/006_classification_reference_fk.sql`

## DB changes

- New table: `priority_levels` (low/medium/high/critical seeded with RU names).
- FK columns on: `review_phrase_patterns`, `response_templates`, `review_classifications`, `rejection_feedback`, `evaluation_results` (if table exists).
- Indexes on all new FK columns.

## Backend changes

- Model: `PriorityLevel`; FK + relationships on working entities.
- Service: `ClassificationRefsService` — resolve code↔id, validate, sync legacy, build `ClassificationRefOut`.
- `ClassificationService` — validates LLM codes against reference tables; phrase overrides use FK codes.
- `ReviewPipeline` — persists `scenario_id` / `sentiment_id` / `priority_id`.
- `TemplateSelectionService` — scores templates by FK ids.
- `moderation.submit_ai_draft_rejection_feedback` — corrected values by UUID; snapshots LLM ids before update.
- Admin CRUD — `scenario_id` / `sentiment_id` / `priority_id` on phrases/templates.
- Analytics distributions — join reference tables for human-readable labels.
- API: `GET /api/reference/classification` (operator + administrator).

## Frontend changes

- `frontend/src/lib/classificationReference.js` — fetch shared dictionary.
- KB: `ref_select` fields in `kbModel.js`; `KnowledgeBaseWorkspace` renders dropdowns from reference API.
- Operator: `RejectionFeedbackModal` uses UUID selects from reference data; `displayLabels.refName()` supports API ref objects.
- Filters on operator queue still use canonical **codes** on list items (derived from FK).

## API changes

- **New:** `GET /api/reference/classification` → `{ scenarios, sentiments, priorities: [{ id, code, name }] }`
- **Admin phrases/templates:** create/patch with `*_id`; response nested `scenario` / `sentiment` / `priority` ref objects.
- **Operator/customer classification:** `ClassificationOut` with nested refs (not raw strings only).
- **Rejection feedback:** request `operator_corrected_*_id`; response `llm_sentiment` (renamed from tone in JSON), nested refs.

## Data migration strategy

1. Seed `priority_levels`.
2. Add nullable FK columns.
3. `UPDATE ... FROM` join on `scenario_code` / `sentiment_code` / `priority_code`.
4. Sync legacy string columns from FK for deprecated compatibility.
5. No auto-creation of reference rows for unknown LLM codes — `ClassificationReferenceError` → pipeline failure.

## Verification commands and results

```bash
cd frontend && npm run build   # OK
python3 -m compileall backend/app -q   # OK
curl -H 'X-Role: operator' http://localhost:8700/api/reference/classification   # OK
```

```sql
SELECT priority_code, priority_name FROM priority_levels ORDER BY sort_order;
-- 4 rows: low, medium, high, critical

SELECT COUNT(*) FROM review_phrase_patterns WHERE scenario_id IS NULL OR sentiment_id IS NULL OR priority_id IS NULL;
-- 0

SELECT COUNT(*) FROM response_templates WHERE scenario_id IS NULL OR sentiment_id IS NULL OR priority_id IS NULL;
-- 0

SELECT COUNT(*) FROM review_classifications WHERE scenario_id IS NULL OR sentiment_id IS NULL OR priority_id IS NULL;
-- 0
```

Applied on dev DB: `010_classification_reference_fk.sql` (recorded in `schema_migrations`). Rebuilt `backend` + `frontend` Docker images.

## Known remaining risks

- Legacy string columns still exist — a future sprint can drop them after full audit.
- `evaluation_results` FK columns added in SQL only if table exists; no SQLAlchemy model yet.
- Backend container must be rebuilt/restarted to pick up migration file `010` on fresh deploys (lifespan migrate).
- Phrases/templates with intentionally empty S/T/P are not allowed if all three FKs required for matching — current data backfilled to non-null where strings existed.

## Documentation

- `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` — notes in §6 and §12.
- `IMPLEMENTATION_PLAN.md` — architecture note at end.

---

## FULL PROMPT

(See below — identical to `cursor_tasks_local/2026-05-29_sprint_021a_normalize_classification_reference_data_fk.md`)
# Sprint 021A — Normalize Classification Reference Data: FK Migration for Scenario / Sentiment / Priority

## Контекст

В текущем SOT и текущей реализации обнаружен архитектурный дефект:

- `scenario`;
- `sentiment` / `tone` / `tonality`;
- `priority`

используются как строковые константы в связанных таблицах и UI-формах.

Это неверно.

Сценарии, тональности и приоритеты имеют все признаки НСИ / справочников.

Следовательно, они должны быть представлены как reference data entities с устойчивыми `id`, уникальными business codes и human-readable labels, а связи из рабочих таблиц должны идти через foreign keys.

Текущая задача — НЕ UI-polish.

Текущая задача — полноценная архитектурная нормализация classification reference data по всему проекту.

---

# Главная цель

Перевести систему с модели:

```text
review_phrase_patterns.scenario = "complaint"
review_phrase_patterns.sentiment = "negative"
review_phrase_patterns.priority_hint = "high"

response_templates.scenario = "complaint"
response_templates.sentiment = "negative"
response_templates.priority = "high"

review_classifications.scenario = "complaint"
review_classifications.sentiment = "negative"
review_classifications.priority = "high"
```

на модель:

```text
review_phrase_patterns.scenario_id  -> interaction_scenarios.id
review_phrase_patterns.sentiment_id -> sentiment_profiles.id
review_phrase_patterns.priority_id  -> priority_levels.id

response_templates.scenario_id      -> interaction_scenarios.id
response_templates.sentiment_id     -> sentiment_profiles.id
response_templates.priority_id      -> priority_levels.id

review_classifications.scenario_id  -> interaction_scenarios.id
review_classifications.sentiment_id -> sentiment_profiles.id
review_classifications.priority_id  -> priority_levels.id
```

Коды `complaint`, `negative`, `high` остаются, но только как уникальные business codes внутри справочников, а не как свободные строки в связанных таблицах.

---

# Критически важно

Это НЕ временный workaround.

Это НЕ “оставить строки и сделать select на frontend”.

Это НЕ “зафиксировать технический долг”.

Нужно выполнить полноценную FK-нормализацию:

- DB migration;
- backend models;
- services;
- API schemas;
- frontend forms;
- display labels;
- seed data;
- existing data migration;
- validation;
- build/test verification.

---

# Запрещено

Запрещено:

- оставлять свободный ручной ввод `scenario`, `sentiment`, `priority` в UI;
- сохранять новые данные в связанные таблицы строковыми С/Т/П;
- создавать новые локальные enum-mapping костыли;
- дублировать справочники в frontend;
- hardcode справочники в JSX;
- делать частичную миграцию только для одного экрана;
- менять customer-facing workflow без необходимости;
- ломать operator console lifecycle;
- менять смысл pipeline.

---

# Разрешено

Разрешено:

- добавить миграции БД;
- добавить новую таблицу `priority_levels`;
- доработать существующие `interaction_scenarios` и `sentiment_profiles`;
- добавить FK-поля в рабочие таблицы;
- перенести данные из строковых полей в FK;
- переписать backend queries;
- переписать serializers/schemas;
- переписать admin KB editors;
- переписать operator detail metadata;
- переписать rejection modal classification correction;
- обновить seed/demo data;
- оставить старые строковые поля только как deprecated compatibility на время миграции, но НЕ использовать их в runtime.

---

# Обязательное чтение перед началом

Перед кодом прочитать:

1. фактический SOT-файл проекта 'Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md' в корневом каталоге, содержащий разделы про модель классификации, формулировки отзывов, шаблоны ответов и PostgreSQL schema.
2. `IMPLEMENTATION_PLAN.md`
3. текущие migration files в `infra/db/migrations/`
4. backend models/entities
5. backend services classification/template/moderation
6. frontend admin/operator KB components
7. `frontend/src/lib/displayLabels.js`

---

# Критическое замечание по SOT

В SOT сейчас зафиксирована недостаточно нормализованная схема:

- `review_phrase_patterns.scenario`
- `review_phrase_patterns.sentiment`
- `review_phrase_patterns.priority_hint`
- `response_templates.scenario`
- `response_templates.sentiment`
- `response_templates.priority`
- `review_classifications.scenario`
- `review_classifications.sentiment`
- `review_classifications.priority`

Эту часть архитектуры считать подлежащей исправлению.

После реализации обновить SOT / Implementation Plan компактной записью:

```text
Scenario / sentiment / priority are reference data entities.
Working tables reference them through FK ids.
Codes remain unique business identifiers inside reference tables.
UI uses selects backed by reference dictionaries.
```

---

# Целевая модель НСИ

## 1. interaction_scenarios

Справочник сценариев.

Минимально:

```text
id UUID / PK
scenario_code TEXT UNIQUE NOT NULL
scenario_name TEXT NOT NULL
description TEXT
required_response_elements JSONB / TEXT nullable
forbidden_response_elements JSONB / TEXT nullable
escalation_rules JSONB / TEXT nullable
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP
updated_at TIMESTAMP
```

Примеры initial data:

```text
question    / Вопрос
complaint   / Жалоба
gratitude   / Благодарность
suggestion  / Предложение
```

---

## 2. sentiment_profiles

Справочник тональностей.

Минимально:

```text
id UUID / PK
sentiment_code TEXT UNIQUE NOT NULL
sentiment_name TEXT NOT NULL
tone_policy TEXT / JSONB nullable
forbidden_tone TEXT / JSONB nullable
escalation_hint TEXT nullable
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP
updated_at TIMESTAMP
```

Примеры initial data:

```text
positive   / Позитивная
neutral    / Нейтральная
negative   / Негативная
aggressive / Агрессивная
```

---

## 3. priority_levels

Новый справочник приоритетов.

Минимально:

```text
id UUID / PK
priority_code TEXT UNIQUE NOT NULL
priority_name TEXT NOT NULL
sort_order INTEGER NOT NULL
description TEXT nullable
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP
updated_at TIMESTAMP
```

Примеры initial data:

```text
low      / Низкий
medium   / Средний
high     / Высокий
critical / Критический
```

---

# Таблицы, подлежащие FK-нормализации

Минимально проверить и мигрировать все таблицы, где используются С/Т/П.

Обязательные таблицы:

1. `review_phrase_patterns`
2. `response_templates`
3. `review_classifications`
4. `evaluation_results`
5. `rejection_feedback`

Также выполнить audit по всей схеме и коду:
если есть другие таблицы / модели / API payloads, где хранятся С/Т/П строками как рабочие связи, включить их в миграцию или явно объяснить, почему они остаются только snapshot/debug fields.

---

# Целевая структура связей

## review_phrase_patterns

Добавить:

```text
scenario_id  FK -> interaction_scenarios.id
sentiment_id FK -> sentiment_profiles.id
priority_id  FK -> priority_levels.id
```

`priority_hint` заменить или deprecated в пользу `priority_id`.

Старые поля `scenario`, `sentiment`, `priority_hint`:
- не использовать в runtime;
- либо удалить после migration;
- либо оставить nullable/deprecated только если это требуется для совместимости.

---

## response_templates

Добавить:

```text
scenario_id  FK -> interaction_scenarios.id
sentiment_id FK -> sentiment_profiles.id
priority_id  FK -> priority_levels.id
```

Старые поля `scenario`, `sentiment`, `priority`:
- не использовать в runtime;
- удалить или deprecated.

Template selection должен работать через FK / joins, а не через free string fields.

---

## review_classifications

Добавить:

```text
scenario_id  FK -> interaction_scenarios.id
sentiment_id FK -> sentiment_profiles.id
priority_id  FK -> priority_levels.id
```

Важно:

LLM может возвращать canonical codes:

```json
{
  "scenario": "complaint",
  "sentiment": "negative",
  "priority": "high"
}
```

Backend обязан:

1. validate codes against reference tables;
2. resolve codes to ids;
3. persist ids;
4. optionally store original raw LLM output in debug/raw metadata, not as primary relation.

---

## evaluation_results

Expected/predicted values должны быть нормализованы.

Добавить / использовать:

```text
expected_scenario_id
predicted_scenario_id
expected_sentiment_id
predicted_sentiment_id
expected_priority_id
predicted_priority_id
```

Если для MVP слишком тяжело полностью мигрировать evaluation UI, минимально:
- создать FK fields;
- перенести данные;
- backend/API читать из FK;
- старые text fields оставить deprecated только на время.

---

## rejection_feedback

Текущая таблица содержит:

```text
llm_scenario
llm_tone
llm_priority
operator_corrected_scenario
operator_corrected_tone
operator_corrected_priority
```

Нужно заменить / дополнить FK-полями:

```text
llm_scenario_id
llm_sentiment_id
llm_priority_id
operator_corrected_scenario_id
operator_corrected_sentiment_id
operator_corrected_priority_id
```

Важно:

В UI rejection modal оператор выбирает corrected values из справочников.

Backend сохраняет ids.

Для аналитики можно отдавать code/name через join.

---

# Migration strategy

## Требование

Миграция должна быть идемпотентной насколько возможно.

Не должна ломать существующие demo data.

---

## Шаги миграции

1. Ensure reference tables exist.
2. Ensure required reference rows exist.
3. Add `priority_levels` table if missing.
4. Add FK columns to affected tables.
5. Backfill FK columns from existing string codes.
6. Add NOT NULL constraints only after successful backfill where safe.
7. Add FK constraints.
8. Add indexes on FK columns.
9. Keep or drop legacy string columns according to safest project practice.

---

# Важное правило по legacy fields

Если старые string fields остаются:

- пометить их deprecated в comments / docs;
- runtime code не должен читать их как source of truth;
- UI не должен отображать их напрямую;
- new writes не должны обновлять их как primary relation.

Если старые string fields удаляются:

- убедиться, что весь backend/frontend переписан.

Выбрать безопасный вариант и явно описать решение в session log.

---

# Backend changes

Проверить и переписать:

1. SQLAlchemy models/entities.
2. Pydantic schemas.
3. CRUD/repository functions.
4. Classification persistence.
5. Template selection.
6. Phrase pattern matching.
7. Moderation detail builder.
8. Rejection feedback service.
9. Evaluation services.
10. Admin KB API endpoints.
11. Seed/demo data initialization.

---

# Template selection target

Было неверно:

```python
template = get_template(
    scenario="complaint",
    sentiment="negative",
    priority="high",
)
```

Должно быть:

```python
scenario = get_scenario_by_code("complaint")
sentiment = get_sentiment_by_code("negative")
priority = get_priority_by_code("high")

template = get_template(
    scenario_id=scenario.id,
    sentiment_id=sentiment.id,
    priority_id=priority.id,
)
```

или equivalent optimized join query.

---

# Classification persistence target

LLM output:

```json
{
  "scenario": "complaint",
  "sentiment": "negative",
  "priority": "high"
}
```

Backend:

1. validates codes exist;
2. resolves ids;
3. stores FK ids;
4. returns both canonical code and display name to UI.

---

# API response target

Для UI API должен отдавать удобную структуру:

```json
{
  "scenario": {
    "id": "...",
    "code": "complaint",
    "name": "Жалоба"
  },
  "sentiment": {
    "id": "...",
    "code": "negative",
    "name": "Негативная"
  },
  "priority": {
    "id": "...",
    "code": "high",
    "name": "Высокий"
  }
}
```

Допустим flat формат:

```json
{
  "scenario_id": "...",
  "scenario_code": "complaint",
  "scenario_name": "Жалоба"
}
```

Но запрещено отдавать UI только raw string без справочной информации.

---

# Frontend changes

Переписать все формы / редакторы, где С/Т/П сейчас вводятся вручную.

Обязательные места:

1. Admin → Формулировки / часто встречающиеся фразы.
2. Admin → Шаблоны ответов.
3. Admin → Сценарии.
4. Admin → Тональности.
5. Admin → Evaluation / expected vs actual where applicable.
6. Operator console metadata display.
7. Rejection feedback modal corrected values.
8. Filters/dropdowns across operator/admin.

---

# UI requirements

## Формулировки / phrases

Поля:

- сценарий;
- тональность;
- приоритет

должны быть select/dropdown, а не text input.

Options должны приходить из backend reference data endpoints или shared loaded dictionaries.

---

## Шаблоны ответов / templates

Поля:

- сценарий;
- тональность;
- приоритет

должны быть select/dropdown, а не text input.

---

## Rejection modal

Для причины:

```text
Неверно определены сценарий / тональность / приоритет
```

select-поля должны быть заполнены текущими значениями LLM и позволять выбрать корректные значения из справочников.

Validation:

- нельзя сохранить, если ни одно значение не изменено;
- нельзя сохранить значение, отсутствующее в справочнике.

---

# Reference data endpoints

Если их нет, добавить API endpoints для получения справочников:

```text
GET /api/reference/scenarios
GET /api/reference/sentiments
GET /api/reference/priorities
```

или один endpoint:

```text
GET /api/reference/classification
```

Ответ должен содержать active rows with id/code/name.

---

# Display labels

`frontend/src/lib/displayLabels.js` должен быть совместим с reference-data approach.

После backend rollout frontend может:
- использовать names from API;
- использовать displayLabels as fallback;
- НЕ hardcode local dictionaries inside components.

---

# Validation / integrity requirements

Backend должен запрещать:

- сохранение phrase pattern с несуществующим scenario/sentiment/priority;
- сохранение template с несуществующим scenario/sentiment/priority;
- сохранение corrected rejection values вне справочников;
- сохранение classification с unknown code без явного fallback/error handling.

---

# Unknown LLM output handling

Если LLM вернула unknown scenario/sentiment/priority code:

Не создавать автоматически новый справочник.

Правильное поведение:

- mark classification as failed or needs review;
- log validation error;
- use safe fallback only if such fallback already exists in SOT;
- do not silently persist garbage strings.

---

# Tests / verification

Обязательно выполнить:

```bash
cd frontend && npm run build
```

Если есть backend tests:

```bash
pytest
```

Если tests нет, выполнить smoke checks:

1. Apply migration to dev DB.
2. Verify reference tables populated.
3. Verify phrases have FK values.
4. Verify templates have FK values.
5. Verify operator review detail loads.
6. Verify admin phrases editor shows selects.
7. Verify admin templates editor shows selects.
8. Verify rejection modal saves FK-backed corrected values.
9. Verify template selection still works.

---

# SQL verification commands

В session log привести фактические SQL checks, например:

```sql
SELECT scenario_code, scenario_name FROM interaction_scenarios ORDER BY scenario_code;
SELECT sentiment_code, sentiment_name FROM sentiment_profiles ORDER BY sentiment_code;
SELECT priority_code, priority_name FROM priority_levels ORDER BY sort_order;

SELECT COUNT(*) FROM review_phrase_patterns WHERE scenario_id IS NULL OR sentiment_id IS NULL OR priority_id IS NULL;
SELECT COUNT(*) FROM response_templates WHERE scenario_id IS NULL OR sentiment_id IS NULL OR priority_id IS NULL;
SELECT COUNT(*) FROM review_classifications WHERE scenario_id IS NULL OR sentiment_id IS NULL OR priority_id IS NULL;
```

---

# Documentation updates

Обновить:

1. SOT section 12 schema.
2. SOT section 6 classification model.
3. SOT section 7 phrase patterns.
4. SOT section 8 templates.
5. Implementation plan / current architecture notes if present.

Коротко, без переписывания всего документа.

---

# Operational discipline

Session log обязателен:

```text
docs/cursor_sessions/2026-05-29_sprint_021a_normalize_classification_reference_data_fk.md
```

Session log должен содержать:

1. FULL PROMPT.
2. Root cause: why string constants were architecturally wrong.
3. Migration design.
4. DB changes.
5. Backend changes.
6. Frontend changes.
7. API changes.
8. Data migration strategy.
9. Verification commands and results.
10. Known remaining risks.

---

# Acceptance criteria

Task считается выполненным только если:

1. `scenario`, `sentiment`, `priority` представлены как reference data.
2. `priority_levels` существует как справочник.
3. Working tables reference С/Т/П through FK ids.
4. Existing data migrated.
5. Backend runtime no longer depends on free string S/T/P fields in working tables.
6. Admin phrase editor uses dropdowns, not text input.
7. Admin template editor uses dropdowns, not text input.
8. Rejection modal uses dropdowns backed by reference data.
9. Template selection works through normalized references.
10. Operator console still opens review details.
11. Frontend build succeeds.
12. Session log contains FULL PROMPT.

---

# Final warning

Do NOT implement a cosmetic frontend-only fix.

This task is a full architectural normalization of classification reference data.

If the result still allows free text typing of scenario/sentiment/priority in knowledge entities, the task is NOT complete.
