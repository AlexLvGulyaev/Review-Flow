# IMPLEMENTATION_PLAN — AI-ассистент для работы с отзывами клиентов

## 1. Назначение документа

Документ описывает порядок реализации проекта на основе SOT:

**«Архитектурные и продуктовые решения проекта»**.

Цель Implementation Plan — разложить разработку на управляемые этапы, чтобы Cursor выполнял задачи последовательно, без расползания scope и без архитектурных разворотов по ходу реализации.

---

## 2. Принцип реализации

Проект реализуется не как набор разрозненных экранов, а как последовательная система:

1. Сначала создаётся инфраструктурный каркас.
2. Затем фиксируется схема данных.
3. Затем реализуется основной контур обработки отзыва.
4. После этого добавляются операторская проверка, промпты, evaluation и аналитика.
5. В конце выполняется упаковка проекта для сдачи, портфолио и демонстрации.

---

## 3. Целевой стек

| Слой | Решение |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI + Python |
| Database | PostgreSQL |
| AI providers | OpenAI / GigaChat |
| Deployment | VPS + Docker Compose |
| Documentation | Markdown docs |
| UI roles | client / operator / administrator |

---

## 4. Основные контуры реализации

| Контур | Назначение |
|---|---|
| Client UI | Форма отправки отзыва и просмотр статуса |
| Operator UI | Очередь отзывов, проверка draft-ответов, публикация |
| Admin UI | Промпты, шаблоны, формулировки, аналитика, evaluation |
| Backend API | Приём данных, pipeline, moderation, analytics |
| PostgreSQL | Основное хранилище данных |
| AI pipeline | Классификация и template-guided generation |
| Evaluation | Проверка качества классификации по версиям промпта |
| Observability | Логи этапов, ошибок, latency, prompt version |

---

# 5. Этапы реализации

## Этап 0. Подготовка репозитория

### Цель
Создать чистую структуру проекта.

### Задачи
- Создать новый репозиторий.
- Добавить базовую структуру каталогов.
- Добавить `.gitignore`.
- Добавить `README.md`.
- Добавить папку `docs/`.
- Положить SOT и Implementation Plan в `docs/architecture/`.

### Ожидаемый результат
Проект готов к разработке и дальнейшей работе Cursor.

---

## Этап 1. Docker Compose и базовая инфраструктура

### Цель
Поднять локальный контур разработки.

### Сервисы
- `backend`
- `frontend`
- `postgres`

### Задачи
- Создать `docker-compose.yml`.
- Создать backend Dockerfile.
- Создать frontend Dockerfile.
- Настроить переменные окружения.
- Проверить запуск всех контейнеров.
- Добавить healthcheck backend.

### Ожидаемый результат
Проект запускается одной командой:

```bash
docker compose up --build
```

---

## Этап 2. PostgreSQL schema

### Цель
Реализовать структуру данных согласно SOT.

### Таблицы
- `customers`
- `service_cases`
- `reviews`
- `review_phrase_patterns`
- `interaction_scenarios`
- `sentiment_profiles`
- `response_templates`
- `review_classifications`
- `review_responses`
- `prompt_versions`
- `evaluation_runs`
- `evaluation_results`
- `review_analytics`
- `operational_logs`

### Задачи
- Создать миграции.
- Добавить базовые справочники:
  - сценарии;
  - тональности;
  - типовые формулировки;
  - шаблоны ответов.
- Добавить тестовые данные.

### Ожидаемый результат
База данных готова к основному pipeline.

---

## Этап 3. Backend skeleton

### Цель
Создать каркас FastAPI-приложения.

### Задачи
- Создать структуру backend:
  - `app/main.py`
  - `app/api/`
  - `app/core/`
  - `app/db/`
  - `app/models/`
  - `app/schemas/`
  - `app/services/`
- Добавить endpoint `/health`.
- Подключить PostgreSQL.
- Добавить базовый repository layer.
- Добавить обработку ошибок.

### Ожидаемый результат
Backend запускается, подключается к БД и отдаёт healthcheck.

---

## Этап 4. Client UI: отправка отзыва

### Цель
Сделать клиентский сценарий начала pipeline.

### Экран
`/review`

### Задачи
- Форма отзыва:
  - имя/идентификатор клиента;
  - service case;
  - product area;
  - rating;
  - review text.
- Отправка отзыва в backend.
- Отображение номера/ID отзыва.
- Отображение начального статуса обработки.

### Ожидаемый результат
Клиент может оставить отзыв через web-форму.

---

## Этап 5. Основной backend pipeline: приём и сохранение отзыва

### Цель
Реализовать первые этапы основного контура.

### Задачи
- Приём отзыва через API.
- Создание или выбор `customer`.
- Создание или выбор `service_case`.
- Сохранение `review`.
- Логирование события.
- Возврат статуса клиенту.

### Ожидаемый результат
Отзывы сохраняются в PostgreSQL и доступны для дальнейшей обработки.

---

## Этап 6. Matching типовых формулировок

### Цель
Реализовать поиск похожей типовой формулировки.

### Задачи
- Добавить сервис `PhraseMatchingService`.
- Реализовать базовый поиск:
  - по ключевым словам;
  - по простому similarity score.
- Сохранять:
  - `matched_phrase_id`;
  - `phrase_match_score`;
  - `classification_source`.
- Если совпадение слабое — выставлять `needs_phrase_review = true`.

### Ожидаемый результат
Система умеет определить, похож ли отзыв на уже известные формулировки.

---

## Этап 7. AI-классификация

### Цель
Классифицировать отзыв по признакам SOT.

### Классификация
- scenario;
- sentiment;
- priority;
- topic;
- product_area;
- confidence.

### Задачи
- Создать `ClassificationService`.
- Подключить активную версию системного промпта.
- Передавать в LLM:
  - текст отзыва;
  - rating;
  - найденную типовую формулировку;
  - допустимые сценарии и тональности.
- Сохранять результат в `review_classifications`.

### Ожидаемый результат
Каждый отзыв получает структурированную классификацию.

---

## Этап 8. Подбор шаблона ответа

### Цель
Найти template для ответа клиенту.

### Логика fallback
1. `scenario + sentiment + priority`
2. `scenario + sentiment`
3. `scenario only`
4. `generic safe template`

### Задачи
- Создать `TemplateSelectionService`.
- Добавить fallback-логику.
- Сохранять выбранный `template_id`.

### Ожидаемый результат
Для каждого классифицированного отзыва подбирается шаблон ответа.

---

## Этап 9. Template-guided generation

### Цель
Сформировать draft-ответ не свободной генерацией, а в рамках шаблона.

### Задачи
- Создать `ResponseGenerationService`.
- Передавать в LLM:
  - отзыв;
  - rating;
  - классификацию;
  - шаблон;
  - ограничения;
  - историю взаимодействия.
- Сохранять draft в `review_responses`.

### Ожидаемый результат
Система формирует черновик ответа для оператора.

---

## Этап 10. Operator UI

### Цель
Реализовать human-in-the-loop проверку.

### Экран
`/operator/reviews`

### Задачи
- Список отзывов в статусе `pending_review`.
- Карточка отзыва:
  - исходный отзыв;
  - rating;
  - service case;
  - классификация;
  - найденная формулировка;
  - выбранный шаблон;
  - draft-ответ.
- Возможность:
  - редактировать ответ;
  - approve;
  - reject;
  - send to revision.

### Ожидаемый результат
Оператор может проверить и финализировать AI-ответ.

---

## Этап 11. Mock publication и клиентский статус

### Цель
Показать полный lifecycle ответа.

### Задачи
- После approve менять `publication_status`.
- Отображать финальный ответ под отзывом.
- Сделать страницу статуса:
  - accepted;
  - processing;
  - pending_review;
  - published.

### Ожидаемый результат
Клиент видит не только факт отправки отзыва, но и финальный опубликованный ответ.

---

## Этап 12. Admin UI: промпты

### Цель
Сделать системный промпт управляемым.

### Экран
`/admin/prompts`

### Задачи
- Список версий промптов.
- Просмотр текста промпта.
- Создание новой версии.
- Установка активной версии.
- Комментарий к изменению.

### Ожидаемый результат
Промпт редактируется через UI и версионируется.

---

## Этап 13. Admin UI: база знаний

### Цель
Сделать управляемыми элементы базы знаний.

### Экраны
- `/admin/phrases`
- `/admin/templates`
- `/admin/scenarios`
- `/admin/sentiments`

### Задачи
- Управление типовыми формулировками.
- Управление шаблонами ответов.
- Управление сценариями.
- Управление профилями тональности.

### Ожидаемый результат
Администратор может обновлять ассистента без изменения кода.

---

## Этап 14. Prompt evaluation subsystem

### Цель
Проверять влияние промпта на качество классификации.

### Экран
`/admin/evaluation`

### Задачи
- Добавить тестовые отзывы.
- Указать expected:
  - scenario;
  - sentiment;
  - priority;
  - topic;
  - product_area.
- Запустить evaluation run по выбранному prompt version.
- Сохранить results.
- Показать:
  - expected;
  - predicted;
  - is_match;
  - error_notes.

### Ожидаемый результат
Можно сравнивать качество классификации между версиями промпта.

---

## Этап 15. Analytics UI

### Цель
Показать сводки по отзывам.

### Экран
`/admin/analytics`

### Метрики
- количество отзывов;
- средний rating;
- распределение sentiment;
- частые topic;
- product_area с наибольшим числом жалоб;
- повторяющиеся проблемы;
- доля отзывов, ушедших в fallback.

### Ожидаемый результат
Администратор видит аналитику, соответствующую ТЗ.

---

## Этап 16. Observability

### Цель
Фиксировать события pipeline.

### Задачи
- Логировать:
  - приём отзыва;
  - matching;
  - classification;
  - template selection;
  - generation;
  - moderation;
  - publication;
  - errors;
  - latency.
- Сделать простой экран `/admin/logs`.

### Ожидаемый результат
Основные события системы доступны для анализа.

---

## Этап 17. Role-based access

### Цель
Развести доступы client / operator / administrator.

### Задачи
- Реализовать простую модель ролей.
- Ограничить доступ к страницам.
- Зафиксировать роли в seed-данных.

### Ожидаемый результат
Пользователи видят только свои контуры.

---

## Этап 18. Deployment на VPS

### Цель
Подготовить проект к демонстрации.

### Задачи
- Проверить Docker Compose на сервере.
- Настроить env.
- Настроить порты.
- Проверить frontend/backend/database.
- Добавить deployment-инструкцию.

### Ожидаемый результат
Проект доступен как работающий web-прототип.

---

## Этап 19. Документация и сдача

### Цель
Подготовить проект к проверке и портфолио.

### Документы
- `README.md`
- `docs/architecture/PROJECT_SOT.md`
- `docs/architecture/IMPLEMENTATION_PLAN.md`
- `docs/user_guide.md`
- `docs/demo_scenarios.md`
- `docs/prompt_description.md`

### Ожидаемый результат
Проект можно:
- сдать на проверку;
- показать в портфолио;
- объяснить куратору;
- использовать как GitHub case.

---

# 6. Приоритеты реализации

## Must have

- PostgreSQL schema;
- client review form;
- review storage;
- phrase matching;
- AI classification;
- template selection;
- draft generation;
- operator moderation;
- prompt versions;
- basic evaluation;
- basic analytics;
- Docker Compose.

## Should have

- Admin UI for phrases/templates;
- mock publication;
- operational logs UI;
- role-based access.

## Could have

- advanced analytics;
- comparison of prompt versions;
- improved matching;
- visual charts;
- export reports.

## Out of scope

- real marketplace integrations;
- autonomous publishing;
- full document RAG;
- Kubernetes;
- distributed queues;
- multi-tenant mode.

---

# 7. Первый рабочий milestone

## Milestone 1 — каркас и БД

Состав:
- репозиторий;
- Docker Compose;
- FastAPI healthcheck;
- React shell;
- PostgreSQL;
- миграции;
- seed data.

Результат:
- проект запускается;
- БД создана;
- frontend и backend доступны;
- можно переходить к основному pipeline.

---

# 8. Второй рабочий milestone

## Milestone 2 — основной pipeline

Состав:
- форма отзыва;
- сохранение отзыва;
- phrase matching;
- AI classification;
- template selection;
- draft generation;
- сохранение результата.

Результат:
- один отзыв проходит pipeline от client form до draft response.

---

# 9. Третий рабочий milestone

## Milestone 3 — operator workflow

Состав:
- Operator UI;
- список отзывов;
- карточка отзыва;
- редактирование draft;
- approve/reject;
- mock publication.

Результат:
- human-in-the-loop workflow работает end-to-end.

---

# 10. Четвёртый рабочий milestone

## Milestone 4 — prompt engineering layer

Состав:
- prompt versions;
- prompt editor;
- evaluation dataset;
- evaluation run;
- expected vs predicted.

Результат:
- можно показать влияние промпта на классификацию.

---

# 11. Пятый рабочий milestone

## Milestone 5 — analytics, docs, deployment

Состав:
- analytics UI;
- logs;
- README;
- demo scenarios;
- VPS deployment.

Результат:
- проект готов к сдаче и демонстрации.

---

## Текущая архитектурная заметка (Sprint 021A)

Scenario / sentiment / priority — reference data entities (`interaction_scenarios`, `sentiment_profiles`, `priority_levels`). Working tables reference them through FK ids (`scenario_id`, `sentiment_id`, `priority_id`). Codes remain unique business identifiers inside reference tables. UI uses selects backed by `GET /api/reference/classification`. Legacy string columns in working tables are deprecated sync mirrors only.

---

# Переход на Controlled Hybrid

> **Нормативный источник:** SOT §3A (`Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`).  
> **Инвентаризация:** `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`.

### Зафиксированное решение

Целевая архитектура проекта — **Controlled Hybrid**: типовая ситуация (`response_cases`) — SOT бизнес-решения; LLM не является основным источником решения; retrieval + правила backend + оператор для спорных случаев.

**Текущий MVP** (phrase match → LLM classification → template scoring → LLM generation → operator moderation) **остаётся в эксплуатации** до завершения цикла **C6** и акцепта владельца.

### Статус циклов

| Цикл | Название | Статус | Зависимости |
|------|----------|--------|-------------|
| **C1** | SOT / CH architecture | **Выполнен** (Sprint 022B) | — |
| **C2** | Data model foundation | **Выполнен** (Sprint 022D — код + миграция `011`) | C1 |
| **C3** | Customer UI preservation | **Спроектирован** (023); реализация не начата | C2 |
| **C4** | Operator CH scenarios | **Выполнен** (Sprint C4 — operator UI) | C2, C6 |
| **C5** | Admin case management | **Выполнен** (Sprint C5 — admin UI + CRUD API) | C2 |
| **C6** | Pipeline transition | **Выполнен** (Sprint C6 — CH pipeline + operator case API) | C2, 023 |
| **C7** | Audit / analytics / quality | **Выполнен** (Sprint C7 — CH quality console + analytics API) | C6 |

**Правило приёмки:** цикл завершён только после **акцепта владельцем системы**. Документация C1 ≠ реализация CH в коде.

### Порядок внедрения (план)

```text
C1 (docs) → C2 (DB + models + read APIs)
         → C6 (backend pipeline CH) — критический путь
         → C4 + C5 (operator + admin UI) — после C2
         → C3 (customer regression) — параллельно, не ломать NL-number / status UX
         → C7 (analytics / audit)
```

### C1 — выполнено (Sprint 022B)

- Обновлён SOT: §3, §3A (CH), пометки as-is в §4.1, §5.
- Обновлён IMPLEMENTATION_PLAN: этот раздел.
- README: уточнение current vs target (если применимо).
- Session log: `docs/cursor_sessions/2026-05-30_sprint_022b_ch_sot_architecture_update.md`.
- **Код, миграции, UI не изменялись.**

### C2 — выполнено (Sprint 022D)

**Цель:** ввести `response_cases` и связанные сущности без отключения текущего pipeline.

**Реализовано:**

- миграция `backend/migrations/011_ch_data_model_foundation.sql` — справочники `product_areas`, `review_topics`; таблицы CH; seed (6 cases, 14 examples);
- ORM: `backend/app/models/ch_entities.py`;
- read API: `GET /api/admin/response-cases`, `GET /api/admin/response-cases/{id}`;
- session log: `docs/cursor_sessions/2026-05-30_sprint_022d_c2_implementation_foundation_v2.md`.

**Решение владельца (акцепт):** старая база знаний (`review_phrase_patterns`, `response_templates`) **не мигрируется** в cases; CH seed создаётся с нуля; legacy KB **оставлена активной** до C6, чтобы не ломать MVP pipeline.

**Не реализовано в C2:** CRUD cases, operator/candidate UI, pipeline retrieval, заполнение `response_case_decisions` / `case_match_results`.

**Следующий шаг (после акцепта владельца):** C6 (pipeline по AC), затем C4/C5 (UI), C3 (регрессия).

### C3+C4+C5 — проектирование выполнено (Sprint 023)

- Документ: `docs/architecture/controlled_hybrid_operational_model.md`
- Session log: `docs/cursor_sessions/2026-05-30_sprint_023_c3_c4_c5_operational_model_design.md`
- **Код, БД, pipeline, UI не изменялись.**

### C4 — выполнено (Sprint C4)

- Operator UI: блок типовой ситуации, confidence, alternatives, confirm/override/candidate.
- Session log: `docs/cursor_sessions/2026-05-30_sprint_c4_operator_ui_controlled_hybrid.md`.

### C6 — выполнено (Sprint C6)

- Controlled Hybrid pipeline: retrieval → confidence → decision → case-based draft (`CH_PIPELINE_ENABLED`, default true).
- Сервисы: `backend/app/services/controlled_hybrid/*`.
- Operator API: `confirm-case`, `override-case`, `case-candidates`; detail: `selected_response_case`, `case_alternatives`.
- Admin: `POST /api/admin/response-case-candidates/{id}/approve`.
- Session log: `docs/cursor_sessions/2026-05-30_sprint_c6_controlled_hybrid_pipeline_transition.md`.
- Legacy pipeline: `CH_PIPELINE_ENABLED=false`.

### C3–C7 — реализация (остальное)

| Цикл | Результат при акцепте |
|------|---------------------|
| C3 | Регрессия: submit, `NL-XXXXXXXX-NNN`, status stepper, published `final_response` |
| C4 | Operator: case, confidence, candidates, override, propose case, feedback |
| C5 | Admin: case CRUD, patterns, approved template, versions, operator proposals queue |
| C6 | Pipeline: case retrieval → policy → bounded LLM; deprecate LLM-primary classify |
| C7 | Metrics: retrieval misses, unknown cases, operator correction analytics |

### Зависимости от legacy milestones

Milestones 1–5 (ingestion, operator workflow, prompts, analytics) **сохраняются** как достигнутый фундамент. CH — эволюция поверх MVP, не отмена учебных целей §2 SOT.
