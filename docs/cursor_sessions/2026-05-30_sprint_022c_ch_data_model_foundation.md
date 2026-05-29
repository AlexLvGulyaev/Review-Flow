# Sprint 022C — C2. Проектирование физической модели данных Controlled Hybrid

**Date:** 2026-05-30  
**Status:** Completed (design / documentation only)  
**Type:** Архитектурное проектирование — **без кода, миграций, БД, UI**

**Task source:** `cursor_tasks_local/2026-05-30_sprint_022c_ch_data_model_foundation.md`

---

## Executive summary

Подготовлена **минимальная физическая модель CH** для Review Flow: 5 новых таблиц в scope реализации C2 (`response_cases`, `response_case_examples`, `response_case_candidates`, `response_case_decisions`, `response_case_feedback`) + 1 таблица проектирования с отложенной runtime-нагрузкой (`case_match_results`, миграция в C2, заполнение в C6). Справочники С/Т/П и transactional-таблицы `reviews` / `review_responses` **сохраняются**. `review_phrase_patterns` и `response_templates` — **трансформируются** (данные мигрируют, таблицы остаются deprecated до cutover). `review_classifications` и `rejection_feedback` — **трансформируются** (параллельная работа + legacy). Отложены: `response_case_templates`, `response_case_versions`, `knowledge_base_change_requests`.

---

## Studied files

| Source | Purpose |
|--------|---------|
| `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md` | As-is inventory, API/UI |
| `docs/cursor_sessions/2026-05-30_sprint_022b_ch_sot_architecture_update.md` | CH normative §3A |
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | §3A target model |
| `IMPLEMENTATION_PLAN.md` | Cycles C1–C7 |
| `backend/app/models/entities.py` | ORM fact |
| `infra/db/migrations/001_initial_schema.sql` | Base tables |
| `infra/db/migrations/003_milestone4_prompt_registry.sql` | `evaluation_cases` |
| `infra/db/migrations/005_rejection_feedback.sql` | `rejection_feedback` |
| `infra/db/migrations/006_classification_reference_fk.sql` | FK 021A |
| `backend/migrations/010_classification_reference_fk.sql` | Mirror |
| `backend/app/api/*.py`, `frontend/src/**` | Usage (via 022a) |

---

## Requirement 1 — Анализ существующей схемы

| Существующая сущность | Назначение сегодня | UI | API | Судьба в CH |
|----------------------|-------------------|-----|-----|-------------|
| `customers` | Клиент | Customer status (email gate) | `POST /api/reviews`, status by email | **Сохранить** |
| `service_cases` | Контекст заказа/обращения | Operator metadata | Ingest pipeline | **Сохранить** |
| `reviews` | Входящее обращение (SOT транзакции) | Customer submit/status; operator queue | `POST /api/reviews`, operator list/detail | **Сохранить** (+ optional FK на decision позже) |
| `review_phrase_patterns` | Примеры фраз + S/T/P hints для fuzzy match | Admin KB «Формулировки» | `/api/admin/phrases` | **Трансформировать** → `response_case_examples`; таблица **вывести из эксплуатации позже** |
| `interaction_scenarios` | Справочник сценариев | Admin KB; operator filters | `/api/admin/scenarios`, `/api/reference/classification` | **Сохранить** (атрибут case) |
| `sentiment_profiles` | Справочник тональностей | Admin KB; operator filters | `/api/admin/sentiments`, reference | **Сохранить** |
| `priority_levels` | Справочник приоритетов (021A) | Admin KB (via reference); operator filters | reference API | **Сохранить** |
| `response_templates` | Шаблон + policy по S/T/P; scoring | Admin KB «Шаблоны» | `/api/admin/templates` | **Трансформировать** → поля в `response_cases`; **вывести из эксплуатации позже** |
| `review_classifications` | LLM-классификация + phrase metadata | Operator S/T/P display | Pipeline, operator detail | **Трансформировать** → legacy слой; CH: `response_case_decisions` как SOT решения |
| `review_responses` | Draft/final, moderation, publication | Customer `final_response`; operator editor | Approve, status | **Сохранить** (+ `response_case_id`, `response_case_decision_id` в C6) |
| `rejection_feedback` | Отклонение AI draft, коррекция S/T/P | Rejection modal | `reject-feedback` | **Трансформировать** → расширить / дополнить `response_case_feedback` |
| `prompt_versions` | Промпты classification/generation | Admin prompts | `/api/prompts` | **Сохранить** (адаптация LLM, не business SOT) |
| `operational_logs` | Аудит pipeline/moderation | Admin logs; operator timeline | `/api/logs` | **Сохранить** |
| `evaluation_cases` | Ручная оценка по `review_id` | Admin evaluation | `/api/evaluation/cases` | **Сохранить** (расширить case-id в C7) |
| `evaluation_results` | Batch eval expected/predicted (строки + FK 021A в SQL) | **Не установлено по текущему snapshot репозитория** — нет ORM/API UI | **Не установлено** — таблица в 001 schema | **Сохранить**; позже eval по `response_case_id` (C7) |
| `evaluation_runs` | Запуск eval | **Не установлено по текущему snapshot репозитория** — нет ORM | **Сохранить** |
| `review_analytics` | Агрегаты по периодам (001 schema) | **Не установлено по current snapshot** — analytics API использует live queries | `/api/analytics/overview` — live SQL | **Вывести из эксплуатации позже** или заменить case-метриками (C7) |
| `ai_provider_settings` | Настройки провайдеров | Admin AI providers | `/api/settings/ai-providers` | **Сохранить** |

---

## Requirement 2–8 — Минимальная целевая модель CH

### ER (логическая)

```text
interaction_scenarios ──┐
sentiment_profiles ─────┼──< response_cases >──< response_case_examples
priority_levels ────────┘         │
                                  │
reviews ──< response_case_decisions >── (optional) case_match_results
         │                              │
         └──< response_case_candidates ──┘ (promoted_to_case_id → response_cases)
         └──< response_case_feedback
review_responses (legacy template_id; + response_case_id FK in C6)
```

---

### 1. `response_cases` (типовая ситуация — SOT бизнес-решения)

**Назначение:** единая бизнес-сущность «типовая ситуация обращения» (пример: «Задержка поставки подтверждённого заказа»).

**Связи:** N:1 → `interaction_scenarios`, `sentiment_profiles`, `priority_levels`; 1:N → `response_case_examples`; 1:N → `response_case_decisions`.

**Цикл:** **создать в C2** (миграция + ORM + admin read API).

| Поле | Тип (реком.) | Семантика | Пример |
|------|--------------|-----------|--------|
| `id` | UUID PK | Идентификатор типовой ситуации | `a1b2c3d4-...` |
| `case_code` | VARCHAR(64) UNIQUE | Стабильный business code (опционально, для интеграций) | `delivery_delay_confirmed_order` |
| `title` | VARCHAR(255) NOT NULL | Краткое название | `Задержка поставки подтверждённого заказа` |
| `description` | TEXT | Условия применения, контекст | «Клиент сообщает о задержке после подтверждения…» |
| `scenario_id` | UUID FK → `interaction_scenarios` | Сценарий как **атрибут** | FK жалобы |
| `sentiment_id` | UUID FK → `sentiment_profiles` | Тональность как атрибут | FK negative |
| `priority_id` | UUID FK → `priority_levels` | Приоритет как атрибут | FK high |
| `product_area` | VARCHAR(128) | Продукт/направление | `logistics` |
| `topic` | VARCHAR(128) | Узкая тема | `delivery_delay` |
| `response_policy` | TEXT NOT NULL | **Политика:** обязательные/запрещённые элементы, tone, эскалация (не текст ответа) | «Упомянуть срок; не обещать компенсацию без проверки…» |
| `approved_response_text` | TEXT NOT NULL | **Утверждённая текстовая основа** ответа клиенту | «Здравствуйте, {customer_name}! …» |
| `confidence_threshold` | NUMERIC(5,4) NOT NULL DEFAULT 0.75 | Мин. score для auto-select без оператора | `0.75` |
| `review_policy` | VARCHAR(32) NOT NULL DEFAULT `operator_required` | `operator_required` \| `auto_draft_if_confident` \| `auto_publish_if_confident` (последние — C6+) | `operator_required` |
| `is_active` | BOOLEAN DEFAULT true | Участвует в retrieval | `true` |
| `created_by` | VARCHAR(128) | `admin` \| `operator` \| `migration` | `admin` |
| `created_at` | TIMESTAMPTZ | Создание | |
| `updated_at` | TIMESTAMPTZ | Изменение | |

**Не включать:** `match_examples` (только дочерняя таблица).

**Индексы:** `(scenario_id, sentiment_id, priority_id, is_active)`; UNIQUE `(case_code)` если используется.

---

### 2. `response_case_examples` (примеры обращений)

**Назначение:** множество текстовых примеров для retrieval (1:N от case).

**Связи:** N:1 → `response_cases`; optional `source_review_id` → `reviews`.

**Цикл:** **C2**.

| Поле | Тип | Семантика | Пример |
|------|-----|-----------|--------|
| `id` | UUID PK | Id примера | |
| `response_case_id` | UUID FK NOT NULL | Типовая ситуация | |
| `example_text` | TEXT NOT NULL | Текст примера обращения | «Заказ NL-00500001 задерживается третий день» |
| `source` | VARCHAR(32) NOT NULL | `admin_manual` \| `migration_phrase` \| `from_review` \| `operator_proposal` | `migration_phrase` |
| `source_review_id` | UUID FK NULL → `reviews` | Если пример из реального обращения | |
| `legacy_phrase_pattern_id` | UUID NULL | Трассировка из `review_phrase_patterns.id` | |
| `is_active` | BOOLEAN DEFAULT true | Участвует в match | `true` |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Миграция из `review_phrase_patterns`:** см. Requirement 10 (не 1:1 — нужна ручная/эвристическая группировка в case).

---

### 3. `response_case_candidates` (кандидат на новую типовую ситуацию)

**Назначение:** обращение с низкой уверенностью / без match → предложение новой типовой ситуации.

**Связи:** N:1 → `reviews`; optional N:1 → `response_cases` после promote.

**Цикл:** **C2** (таблица + operator/admin API в C4/C5).

| Поле | Тип | Семантика | Пример |
|------|-----|-----------|--------|
| `id` | UUID PK | | |
| `review_id` | UUID FK NOT NULL → `reviews` | Исходное обращение | |
| `status` | VARCHAR(32) NOT NULL | `pending_operator` \| `pending_admin` \| `approved` \| `rejected` \| `merged` | `pending_admin` |
| `proposed_title` | VARCHAR(255) | Черновик названия case | «Задержка на таможне» |
| `proposed_description` | TEXT | Описание ситуации | |
| `proposed_scenario_id` | UUID FK NULL | Предлагаемые атрибуты | |
| `proposed_sentiment_id` | UUID FK NULL | | |
| `proposed_priority_id` | UUID FK NULL | | |
| `proposed_product_area` | VARCHAR(128) | | |
| `proposed_topic` | VARCHAR(128) | | |
| `proposed_response_policy` | TEXT | Черновик политики | |
| `proposed_approved_response_text` | TEXT | Черновик ответа | |
| `proposed_by_operator_id` | VARCHAR(128) | Оператор-инициатор | `operator-ui` |
| `reviewed_by_admin_id` | VARCHAR(128) NULL | Админ | |
| `promoted_response_case_id` | UUID FK NULL → `response_cases` | После утверждения | |
| `merged_into_case_id` | UUID FK NULL | Если объединили с существующим | |
| `rejection_comment` | TEXT NULL | Причина отклонения | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**Жизненный цикл:**

```text
review (low confidence) → INSERT candidate (pending_operator)
→ operator fills proposal → pending_admin
→ admin approve → INSERT response_cases + LINK promoted_response_case_id + examples from review_text
→ OR merge → merged_into_case_id
→ OR reject → rejected
```

---

### 4. `response_case_decisions` (решение по обращению)

**Назначение:** какую типовую ситуацию выбрали для конкретного `review` (SOT решения CH).

**Связи:** N:1 → `reviews`; N:1 → `response_cases`; optional 1:1 с активным `review_classifications` на переходный период.

**Цикл:** **C2** (таблица); **заполнение pipeline — C6**.

| Поле | Тип | Семантика | Пример |
|------|-----|-----------|--------|
| `id` | UUID PK | | |
| `review_id` | UUID FK NOT NULL | Обращение | |
| `response_case_id` | UUID FK NOT NULL | Выбранная типовая ситуация | |
| `decision_source` | VARCHAR(32) NOT NULL | `retrieval_auto` \| `retrieval_operator` \| `operator_override` \| `admin_override` \| `legacy_migration` | `retrieval_auto` |
| `match_confidence` | NUMERIC(5,4) | Уверенность выбора case | `0.82` |
| `is_operator_override` | BOOLEAN DEFAULT false | Ручная смена case | `false` |
| `legacy_classification_id` | UUID FK NULL → `review_classifications` | Связь с MVP-классификацией | |
| `selected_at` | TIMESTAMPTZ | Время решения | |
| `created_at` | TIMESTAMPTZ | | |

**Правило:** одна **активная** decision на review (UNIQUE `review_id` WHERE `is_superseded = false` или версионирование через `superseded_at` — рекомендация: поле `is_current BOOLEAN DEFAULT true` + partial unique index).

**Соотношение с `review_classifications`:** на переходе **обе** таблицы: classification хранит LLM/phrase debug; decision — business SOT. После C6 UI читает decision, classification — optional audit.

---

### 5. `case_match_results` (результаты retrieval)

**Назначение:** все кандидаты-case со score для обращения (для UI альтернатив и аналитики промахов).

**Связи:** N:1 → `reviews`; N:1 → `response_cases` (кандидат); optional N:1 → `response_case_decisions`.

**Цикл:** **спроектировать и создать таблицу в C2**; **заполнение runtime — C6** (до C6 таблица пустая).

| Поле | Тип | Семантика | Пример |
|------|-----|-----------|--------|
| `id` | UUID PK | | |
| `review_id` | UUID FK NOT NULL | | |
| `response_case_id` | UUID FK NOT NULL | Кандидат-case | |
| `match_score` | NUMERIC(5,4) NOT NULL | Score similarity | `0.82` |
| `rank` | SMALLINT NOT NULL | Позиция в списке | `1` |
| `match_method` | VARCHAR(32) | `example_fuzzy` \| `embedding` (future) | `example_fuzzy` |
| `is_selected` | BOOLEAN | Выбранный в decision | `true` |
| `created_at` | TIMESTAMPTZ | | |

**Индекс:** `(review_id, rank)`.

---

### 6. `response_case_feedback` (обратная связь оператора)

**Назначение:** замечание о неверном case / policy / ответе.

**Связи:** N:1 → `reviews`; N:1 → `response_cases`; optional link `response_case_decision_id`; optional `rejection_feedback_id`.

**Цикл:** **C2** (новая таблица); **миграция данных из `rejection_feedback` — постепенно**.

| Поле | Тип | Семантика | Пример |
|------|-----|-----------|--------|
| `id` | UUID PK | | |
| `review_id` | UUID FK NOT NULL | | |
| `response_case_id` | UUID FK NULL | Case, о котором feedback | |
| `response_case_decision_id` | UUID FK NULL | Decision на момент feedback | |
| `feedback_type` | VARCHAR(32) NOT NULL | `wrong_case` \| `wrong_policy` \| `wrong_response_text` \| `classification_error` (legacy) | `wrong_case` |
| `rejection_reason` | VARCHAR(64) NULL | Совместимость с modal: `classification_error`, `unsuitable_template`, `history_ignored` | |
| `operator_id` | VARCHAR(128) | | |
| `comment` | TEXT | | |
| `suggested_case_id` | UUID FK NULL | Оператор указал другой case | |
| `legacy_rejection_feedback_id` | UUID NULL | Трассировка | |
| `created_at` | TIMESTAMPTZ | | |

**Vs `rejection_feedback`:** не модифицировать старую таблицу на C2 — **новая таблица** + dual-write в C4, deprecate `rejection_feedback` позже. Причина: разная семантика (case vs S/T/P ids only).

---

## Requirement 9 — Что НЕ делать сейчас

| Сущность | Делать сейчас? | Причина |
|----------|----------------|---------|
| `response_case_templates` | **Нет** | `approved_response_text` + `response_policy` в `response_cases` достаточно для MVP CH |
| `response_case_versions` | **Нет** | Достаточно `updated_at` + session logs; versioning — после стабилизации KB |
| `knowledge_base_change_requests` | **Нет** | `response_case_candidates` закрывает propose/approve/merge для новых ситуаций |

---

## Requirement 10 — Карта миграции

| Текущая сущность | Целевая сущность / поле | Способ перехода | Риск |
|------------------|-------------------------|-----------------|------|
| `review_phrase_patterns` | `response_case_examples` | Группировка фраз в case (по S/T/P + product_area/topic или ручная KB); `legacy_phrase_pattern_id`; deprecated table read-only | **Высокий:** один phrase ≠ один case; дубли S/T/P |
| `response_templates` | `response_cases.approved_response_text` | Одна строка template → один case; `required_elements`+`forbidden_elements` → `response_policy`; несколько templates на одну тройку S/T/P → **несколько cases** или ручной merge | **Высокий:** N templates per S/T/P |
| `response_templates.title` | `response_cases.title` | Прямое копирование при миграции | Низкий |
| `review_classifications` | `response_case_decisions` (частично) | Эвристика: map (scenario_id,sentiment_id,priority_id) → case_id if exists; иначе candidate; сохранить classification как audit | **Высокий:** LLM S/T/P ≠ case |
| `review_classifications` | `case_match_results` (опционально) | phrase_match_score → synthetic row | Средний |
| `rejection_feedback` | `response_case_feedback` | Copy rows + map rejection_reason → feedback_type; FK case via decision lookup | Средний: нет case_id в старых rows |
| `interaction_scenarios` | `response_cases.scenario_id` | Справочник без изменений | Низкий |
| `sentiment_profiles` | `response_cases.sentiment_id` | То же | Низкий |
| `priority_levels` | `response_cases.priority_id` | То же | Низкий |
| `review_responses.template_id` | `review_responses.response_case_id` (C6) | Populate from decision | Средний |
| `reviews` | без изменения PK | Добавить optional `current_decision_id` (C6) | Низкий |

**Рекомендуемая стратегия миграции данных (реализация после акцепта дизайна):**

1. Seed `response_cases` из уникальных комбинаций `(scenario_id, sentiment_id, priority_id, product_area, topic)` существующих **active** templates.
2. Перенести `template_text` / policy fields в case.
3. Перенести phrases → examples с `legacy_phrase_pattern_id`.
4. Не удалять legacy tables до C6 cutover.

---

## Requirement 11 — Влияние на UI

| Сущность | Клиентский UI | Операторский UI | Административный UI |
|----------|---------------|-----------------|---------------------|
| `response_cases` | Без изменений (MVP) | Показать title, policy excerpt, approved text basis; override select | CRUD case, policy editor, approved text editor |
| `response_case_examples` | — | Показать matched example (optional) | CRUD examples per case |
| `response_case_decisions` | — | Selected case + confidence + source | Read-only audit |
| `case_match_results` | — | Top-N alternatives list | Analytics misses |
| `response_case_candidates` | — | Banner «требуется новая ситуация» + propose | Queue approve/merge/reject |
| `response_case_feedback` | — | Extend reject modal (case-level) | Feedback analytics |
| Legacy KB phrases/templates | — | Hide post-cutover | Replace routes with «Типовые ситуации» |

---

## Requirement 12 — Влияние на API

### Сохранить (контракты)

| API | Примечание |
|-----|------------|
| `POST /api/reviews` | Ingest; внутренне позже пишет decision |
| `GET /api/reviews/requests/{n}/status` | Без изменения клиентского контракта |
| `GET /api/operator/reviews`, `GET .../{id}` | Расширить response body (additive fields) |
| `POST .../approve` | Без breaking change |
| `GET /api/reference/classification` | Сохранить для атрибутов case forms |

### Изменить (additive / v2)

| API | Изменение |
|-----|-----------|
| `GET /api/operator/reviews/{id}` | + `selected_response_case`, `match_confidence`, `case_alternatives[]`, `case_candidate?` |
| `POST .../reject-feedback` | + `response_case_id`, `feedback_type`; dual-write to `response_case_feedback` |
| `GET/POST/PATCH /api/admin/phrases|templates` | Deprecate; redirect semantics to cases в C5 |

### Новые (C2/C4/C5)

| API | Назначение |
|-----|------------|
| `GET/POST/PATCH /api/admin/response-cases` | CRUD cases |
| `GET/POST/PATCH /api/admin/response-cases/{id}/examples` | Examples |
| `GET /api/operator/response-cases/candidates` | Pending candidates |
| `POST /api/admin/response-case-candidates/{id}/approve` | Promote to case |
| `POST /api/admin/response-case-candidates/{id}/merge` | Merge into existing |
| `GET /api/reference/response-cases` | Active cases for selects (operator) |

---

## Requirement 13 — Финальный вывод

### 1. Минимальная рекомендуемая модель CH

**Ядро:** `response_cases` + `response_case_examples` + `response_case_decisions` + `response_case_candidates` + `response_case_feedback` + (`case_match_results`).

**Справочники:** `interaction_scenarios`, `sentiment_profiles`, `priority_levels` — без замены.

**Транзакции:** `reviews`, `review_responses`, `customers`, `service_cases` — без замены.

### 2. Сущности, создаваемые в C2 (следующий sprint реализации)

| # | Таблица |
|---|---------|
| 1 | `response_cases` |
| 2 | `response_case_examples` |
| 3 | `response_case_candidates` |
| 4 | `response_case_decisions` |
| 5 | `response_case_feedback` |
| 6 | `case_match_results` (структура; данные с C6) |

+ ORM models, индексы, seed/backfill script (отдельная задача), read/admin API skeleton.

### 3. Откладываются

- `response_case_versions`
- `knowledge_base_change_requests`
- `response_case_templates` (отдельная таблица)
- Cutover pipeline C6
- Operator/Admin UI C4/C5
- Drop legacy tables

### 4. Не нужны

- Отдельная таблица шаблонов на case при текущем scope
- `review_analytics` как runtime source (если не используется — не развивать)
- Новая сущность вместо `reviews` для входящих обращений

### 5. Риски

| Риск | Митигация |
|------|-----------|
| N:1 templates → 1 case неоднозначно | Workshop + manual curation rules в миграции |
| Phrases без case | Default bucket «unassigned» + admin review |
| Dual pipeline during transition | Feature flag; decision nullable until C6 |
| UNIQUE case per S/T/P too coarse | Различать по `title` + `topic` + `product_area` |
| Operator modal still S/T/P centric until C4 | План C4 сразу после C2 API |

### 6. Вопросы владельцу системы

1. Одна типовая ситуация может иметь **несколько** утверждённых вариантов ответа (A/B) или строго один `approved_response_text`?
2. При миграции: **сколько** `response_templates` на одну тройку S/T/P → один case или несколько cases?
3. `review_policy`: допустима ли **auto_publish** в учебном MVP или только `operator_required`?
4. Нужен ли **обязательный** `case_code` (slug) для интеграций?
5. Порог `confidence_threshold` — глобальный или per-case (спроектировано per-case)?
6. Подтверждение: **новая таблица** `response_case_feedback` вместо расширения `rejection_feedback`?

### 7. План после C2 (design)

| Шаг | Sprint | Содержание |
|-----|--------|------------|
| 1 | **C2 impl** (след.) | Миграция 011+; ORM; seed/backfill; admin read API |
| 2 | **C3** | Customer regression |
| 3 | **C6** | Pipeline writes decision + match_results; generation from case |
| 4 | **C4/C5** | Operator + Admin UI |
| 5 | **C7** | Analytics |

### Изменения в SOT / IMPLEMENTATION_PLAN (после акцепта владельцем)

**Не вносились в этом sprint** (только проектирование). После акцепта рекомендуется:

- **SOT §3A.5** — заменить концептуальную таблицу на физические поля из этого документа; добавить `case_code`, `review_policy` enum, `response_case_candidates` вместо только `knowledge_base_change_requests`.
- **IMPLEMENTATION_PLAN** — в секции C2: ссылка на `docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md`; статус «дизайн завершён, реализация — следующий sprint»; перечислить таблицы 011.

---

## Verification commands

```bash
git status --short
# Expected: no new changes from this sprint except:
# ?? docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md
```

**Подтверждено:** изменён только session log.

---

## Statement

**No backend code, frontend code, database migrations, SOT, or IMPLEMENTATION_PLAN files were modified.**

---

## FULL PROMPT
# Sprint 022C — C2. Проектирование физической модели данных Controlled Hybrid

## Тип задачи

Архитектурная задача.

Запрещено:

- изменять backend-код;
- изменять frontend-код;
- создавать миграции;
- изменять БД;
- выполнять рефакторинг;
- реализовывать новые функции.

Цель задачи — спроектировать и зафиксировать физическую модель данных Controlled Hybrid для Review Flow.

Результатом должен стать утверждённый проект модели данных и план миграции от текущей схемы RF.

---

## Обязательные материалы для изучения

Перед началом работы изучить:

1. `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`
2. `docs/cursor_sessions/2026-05-30_sprint_022b_ch_sot_architecture_update.md`
3. `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
4. `IMPLEMENTATION_PLAN.md`
5. Текущую схему БД проекта.
6. Все сущности, затронутые Sprint 021A.
7. Реальные SQLAlchemy ORM-модели.
8. Реальные миграции.
9. Реальные API-контракты.
10. Реальные frontend-экраны, которые используют сущности базы знаний, классификации, шаблонов и модерации.

Ничего не предполагать.

Все выводы должны основываться только на фактическом коде, миграциях, моделях, API и документации проекта.

Если какая-либо информация отсутствует, писать:

```text
Не установлено по текущему snapshot репозитория.
```

---

## Зафиксированные бизнес-решения

Следующие решения считаются утверждёнными владельцем системы.

### 1. Главная бизнес-сущность

Типовая ситуация является единственным источником бизнес-решения.

Техническое имя допускается:

```text
response_cases
```

Русская бизнес-семантика:

```text
Типовая ситуация обращения
```

Пример:

```text
Задержка поставки подтверждённого заказа
```

а не просто:

```text
Жалоба + негатив + высокий приоритет
```

---

### 2. Сценарий / тональность / приоритет

Сценарий, тональность и приоритет не являются главным ключом выбора ответа.

Они являются атрибутами типовой ситуации.

---

### 3. Политика ответа и типовой ответ

Политика ответа и типовой ответ должны храниться раздельно.

Не объединять в одно поле.

Семантика:

```text
Политика ответа = правила, ограничения, обязательные элементы, запреты.
```

```text
Типовой ответ = утверждённая текстовая основа ответа клиенту.
```

---

### 4. Примеры обращений

Примеры обращений не должны храниться мультизначением в одном поле.

Нужна отдельная дочерняя сущность:

```text
response_case_examples
```

Связь:

```text
Типовая ситуация
1 → N
Примеры обращений
```

---

### 5. Источники создания типовых ситуаций

Допускаются оба варианта:

1. Администратор создаёт типовую ситуацию вручную.
2. Оператор предлагает новую типовую ситуацию из спорного или неизвестного обращения.

---

### 6. Поведение при низкой уверенности

Если система не нашла подходящую типовую ситуацию или уверенность низкая:

```text
обращение
→ кандидат на новую типовую ситуацию
→ операторская обработка
```

Система не должна просто терять такие случаи и не должна молча отдавать всё в обычный fallback.

---

## Основная задача

Определить минимальную физическую модель данных Controlled Hybrid.

Нужно ответить:

1. Какие существующие сущности RF сохраняются.
2. Какие существующие сущности RF трансформируются.
3. Какие новые сущности действительно необходимы.
4. Какие сущности не нужны на текущем этапе.
5. Как текущая схема переходит к модели:
   ```text
   Типовая ситуация = SOT бизнес-решения
   ```
6. Какие изменения нужно будет внести в SOT и IMPLEMENTATION_PLAN после согласования модели.

---

## Важное ограничение

Это не задача реализации.

Не создавать миграции.

Не менять модели.

Не менять API.

Не менять UI.

Не писать код.

Только анализ и проектирование физической модели.

---

## Требование 1. Анализ существующей схемы

Сначала проанализировать текущую схему.

Подготовить таблицу:

| Существующая сущность | Назначение сегодня | Используется в UI | Используется в API | Судьба в CH |
|---|---|---|---|---|

Для каждой сущности указать одно из решений:

```text
Сохранить
Трансформировать
Вывести из эксплуатации позже
```

Обязательно рассмотреть:

- `customers`
- `service_cases`
- `reviews`
- `review_phrase_patterns`
- `interaction_scenarios`
- `sentiment_profiles`
- `priority_levels`
- `response_templates`
- `review_classifications`
- `review_responses`
- `rejection_feedback`
- `prompt_versions`
- `operational_logs`
- `evaluation_cases`
- `evaluation_results`
- `review_analytics`
- `ai_provider_settings`

Если фактическое имя отличается — использовать фактическое имя из репозитория.

---

## Требование 2. Минимальная целевая модель CH

Спроектировать минимальный набор сущностей.

Обязательные кандидаты:

1. `response_cases`
2. `response_case_examples`
3. `response_case_candidates`
4. `response_case_decisions`
5. `case_match_results`
6. `response_case_feedback`

Для каждой сущности подготовить таблицу:

| Поле | Семантика | Пример значения |
|---|---|---|

Также указать:

- назначение сущности;
- связи;
- бизнес-обоснование;
- нужна ли сущность уже в C2 или позже.

---

## Требование 3. Минимальная таблица response_cases

Минимально проверить и спроектировать поля:

| Поле | Семантика |
|---|---|
| id | Уникальный идентификатор типовой ситуации |
| title | Краткое название типовой ситуации |
| description | Подробное описание ситуации и условий применения |
| scenario_id | Сценарий как атрибут ситуации |
| sentiment_id | Тональность как атрибут ситуации |
| priority_id | Приоритет как атрибут ситуации |
| product_area | Продукт / услуга / направление бизнеса |
| topic | Узкая тема обращения |
| response_policy | Правила подготовки ответа |
| approved_response_text | Утверждённая текстовая основа ответа |
| confidence_threshold | Минимальная уверенность для автоматического выбора |
| review_policy | Порядок согласования ответа |
| is_active | Используется ли ситуация в работе |
| created_at | Дата создания |
| updated_at | Дата изменения |

Важно:

- не добавлять `match_examples` в `response_cases`;
- примеры обращений должны быть в дочерней таблице.

---

## Требование 4. Таблица response_case_examples

Спроектировать дочернюю таблицу примеров обращений.

Минимальные поля-кандидаты:

| Поле | Семантика |
|---|---|
| id | Уникальный идентификатор примера |
| response_case_id | Ссылка на типовую ситуацию |
| example_text | Текст примера обращения |
| source | Источник примера |
| is_active | Используется ли пример для поиска |
| created_at | Дата создания |
| updated_at | Дата изменения |

Проверить, можно ли мигрировать часть данных из `review_phrase_patterns`.

---

## Требование 5. Кандидаты на новые типовые ситуации

Спроектировать сущность для случаев низкой уверенности.

Рабочее имя:

```text
response_case_candidates
```

Бизнес-семантика:

```text
Кандидат на новую типовую ситуацию
```

Нужна для сценария:

```text
система не нашла подходящий case
→ создала кандидата
→ оператор видит кандидата
→ администратор позже утверждает / отклоняет / объединяет с существующим case
```

Минимально определить:

- какие поля нужны;
- как кандидат связан с `review`;
- как кандидат связан с оператором;
- как кандидат позже превращается в `response_case`;
- какие статусы нужны.

---

## Требование 6. История решений по обращениям

Спроектировать сущность:

```text
response_case_decisions
```

Бизнес-семантика:

```text
Какую типовую ситуацию система или оператор выбрали для конкретного обращения.
```

Назначение:

- хранить выбранный case;
- хранить источник решения;
- хранить уверенность;
- хранить признак ручного override;
- позволять аудит;
- позволять аналитику промахов.

Проверить, как эта сущность соотносится с текущей `review_classifications`.

---

## Требование 7. Результаты поиска типовой ситуации

Спроектировать сущность:

```text
case_match_results
```

Бизнес-семантика:

```text
Кандидаты, которые система нашла при поиске типовой ситуации.
```

Назначение:

- хранить список найденных candidates;
- хранить score;
- хранить ранжирование;
- показывать оператору альтернативы;
- анализировать ошибки retrieval.

Определить, нужна ли эта сущность в C2 сразу, или может быть отложена до C6.

---

## Требование 8. Обратная связь операторов

Спроектировать:

```text
response_case_feedback
```

Бизнес-семантика:

```text
Замечание оператора о том, что выбранная типовая ситуация, политика или ответ были неверными.
```

Проверить связь с текущей `rejection_feedback`.

Определить:

- что можно переиспользовать;
- что нужно расширить;
- нужно ли создавать новую таблицу или достаточно модифицировать существующую.

---

## Требование 9. Специально проверить, что НЕ делать сейчас

Не считать автоматически нужными следующие сущности:

```text
response_case_templates
response_case_versions
knowledge_base_change_requests
```

Для каждой дать решение:

| Сущность | Делать сейчас? | Причина |
|---|---|---|

Ориентир:

- `response_case_templates` может быть не нужна, если `approved_response_text` хранится прямо в `response_cases`.
- `response_case_versions` может быть отложена, если пока достаточно `updated_at` и session logs.
- `knowledge_base_change_requests` может быть отложена, если `response_case_candidates` закрывает минимальный сценарий предложения новой ситуации.

---

## Требование 10. Карта миграции

Подготовить карту:

| Текущая сущность | Целевая сущность / поле | Способ перехода | Риск |
|---|---|---|---|

Обязательно рассмотреть:

- `review_phrase_patterns` → `response_case_examples`
- `response_templates` → `response_cases.approved_response_text`
- `response_templates.required_elements` / `forbidden_elements` → `response_cases.response_policy`
- `review_classifications` → `response_case_decisions`
- `rejection_feedback` → `response_case_feedback`
- `interaction_scenarios`, `sentiment_profiles`, `priority_levels` → атрибуты `response_cases`

---

## Требование 11. Влияние на UI

Подготовить таблицу:

| Сущность | Клиентский UI | Операторский UI | Административный UI |
|---|---|---|---|

Важно:

- клиентский UI должен остаться почти без изменений;
- операторский UI должен позже получить выбранную типовую ситуацию, confidence, альтернативы и кандидата;
- административный UI должен позже получить управление типовыми ситуациями и примерами.

---

## Требование 12. Влияние на API

Подготовить список:

1. Какие существующие API можно сохранить.
2. Какие существующие API нужно будет изменить.
3. Какие новые API понадобятся.

Без реализации.

Особенно рассмотреть:

- customer submit/status API;
- operator review detail API;
- operator approve/reject-feedback API;
- admin phrases/templates API;
- reference classification API.

---

## Требование 13. Финальный вывод

В конце отчёта обязательно сформировать:

1. Минимальную рекомендуемую модель данных CH.
2. Сущности, которые создаются в C2.
3. Сущности, которые откладываются.
4. Сущности, которые не нужны.
5. Риски.
6. Вопросы владельцу системы.
7. План следующего шага после C2.

---

## Лог сессии

Создать:

```text
docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md
```

Лог должен содержать:

1. FULL PROMPT.
2. Изученные файлы.
3. Изученные сущности.
4. Анализ существующей модели.
5. Проект минимальной модели CH.
6. Карта миграции.
7. Влияние на UI.
8. Влияние на API.
9. Решение по спорным сущностям.
10. Риски.
11. Вопросы владельцу.
12. Проверочные команды.

---

## Проверка

Выполнить только read-only команды.

Минимально:

```bash
git status --short
```

И при необходимости команды просмотра структуры проекта, моделей и миграций.

Не изменять файлы, кроме session log.

---

## Критерии завершения

Задача считается выполненной только если:

1. Проанализирована существующая модель.
2. Предложена минимальная модель CH.
3. Для каждой новой сущности есть бизнес-семантика.
4. Для каждой новой сущности есть поля и связи.
5. Подготовлена карта миграции.
6. Указано влияние на UI.
7. Указано влияние на API.
8. Отдельно указано, что не делаем сейчас.
9. Нет изменений backend/frontend/DB.
10. Создан session log с FULL PROMPT.

---

## Ответ Cursor

Кратко сообщить:

```text
Выполнено. C2 data model foundation подготовлен.

Лог:
docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md

Изменения backend/frontend/БД не выполнялись.
```
