# Cursor Task 000 — Project bootstrap intake

## Контекст

Ты работаешь в проекте `review-flow`.

Проект: AI-ассистент для работы с отзывами клиентов.

Это не игрушечный учебный чат и не свободная генерация ответов. Целевой подход проекта:

- template-guided AI workflow;
- human-in-the-loop moderation;
- PostgreSQL как основное хранилище;
- FastAPI backend;
- React + Vite frontend;
- Docker Compose контур;
- prompt versioning и evaluation в последующих milestone.

В корне проекта уже лежат базовые документы:

- `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`;
- `IMPLEMENTATION_PLAN.md`;
- исходное учебное ТЗ может лежать рядом, но Source of Truth проекта — SOT и Implementation Plan.

Также создана папка `docs/architecture/`, где лежит документ операционной дисциплины.

## Важное ограничение

На этом шаге НЕ нужно начинать разработку приложения.

Это нулевой intake-task.

Твоя задача — внимательно прочитать проектные документы, понять архитектуру, проверить структуру каталога и подготовить краткий engineering status.

Не создавай backend, frontend, docker-compose, миграции и код приложения в рамках этого задания.

## Что нужно сделать

1. Прочитать:
   - `IMPLEMENTATION_PLAN.md`;
   - `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`;
   - `docs/architecture/operational_discipline_assistant_flow_ru.md`, если файл доступен.

2. Проверить текущую структуру каталога проекта.

3. Создать каталог для сессионных логов, если его ещё нет:

```bash
docs/cursor_sessions
```

4. Создать сессионный лог-файл:

```bash
docs/cursor_sessions/2026-05-25_cursor_task_000_project_bootstrap_intake.md
```

5. В начало сессионного лог-файла вставить полный текст этого промпта.

6. Ниже в этом же файле добавить результат своей работы.

## Что должно быть в результате

В сессионном лог-файле нужно зафиксировать:

1. Какие документы прочитаны.
2. Какая структура проекта обнаружена.
3. Как Cursor понимает цель проекта.
4. Как Cursor понимает ближайший Milestone 1.
5. Какие файлы и каталоги уже есть.
6. Какие файлы и каталоги потребуется создать на следующем шаге.
7. Есть ли противоречия или неясности в документах.
8. Краткий список рисков перед началом реализации.
9. Рекомендация: готов ли проект к задаче Milestone 1.

## Формат ответа в чат

После выполнения не пересказывай всё подробно в чат.

В чат напиши только:

- где создан session log;
- краткий статус: `ready for Milestone 1` или `blocked`;
- если `blocked`, то почему.

## Запреты

Не делать в рамках этого задания:

- не создавать FastAPI приложение;
- не создавать React приложение;
- не создавать Docker Compose;
- не писать SQL migrations;
- не менять SOT и Implementation Plan;
- не переименовывать существующие файлы;
- не удалять файлы;
- не начинать Milestone 1 без отдельного задания.

---

# Результат выполнения (Cursor, 2026-05-25)

## 1. Прочитанные документы

| Документ | Статус |
|---|---|
| `IMPLEMENTATION_PLAN.md` | Прочитан полностью |
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | Прочитан полностью |
| `docs/architecture/operational_discipline_assistant_flow_ru.md` | Прочитан полностью |
| `ТЗ ИИ-ассистент для работы с отзывами.md` | Обнаружен в корне, не читался (SOT и Plan — source of truth) |

## 2. Обнаруженная структура проекта

```
review-flow/
├── IMPLEMENTATION_PLAN.md
├── Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
├── ТЗ ИИ-ассистент для работы с отзывами.md
├── cursor_tasks_local/
│   └── 2026-05-25_cursor_task_000_project_bootstrap_intake.md
└── docs/
    ├── architecture/
    │   └── operational_discipline_assistant_flow_ru.md
    └── cursor_sessions/
        └── (этот файл)
```

Состояние: **документационный bootstrap**, без прикладного кода, без Docker, без git-репозитория.

## 3. Понимание цели проекта

**review-flow** — web-based AI-система обработки клиентских отзывов с human-in-the-loop модерацией.

Ключевые принципы (из SOT):

- Не свободная генерация ответов, а **template-guided constrained generation**.
- Pipeline: приём отзыва → matching типовых формулировок → AI-классификация → выбор шаблона → draft-ответ → операторская модерация → mock publication.
- Три роли UI: client / operator / administrator.
- PostgreSQL — единственное хранилище; FastAPI + React/Vite; деплой через Docker Compose на VPS.
- Prompt versioning и evaluation — отдельный административный контур (позже milestones).
- MVP явно исключает: автопубликацию, Kubernetes, очереди, multi-tenant, production marketplace integrations.

Учебная и портфельная цель: показать промпт-инжиниринг и работающий прототип, а не только документ с промптом.

## 4. Понимание Milestone 1

По `IMPLEMENTATION_PLAN.md` §7 — **Milestone 1: каркас и БД**.

Состав:

| Компонент | Соответствующие этапы плана |
|---|---|
| Структура репозитория | Этап 0 (частично не выполнен) |
| Docker Compose (`backend`, `frontend`, `postgres`) | Этап 1 |
| FastAPI skeleton + `/health` | Этап 3 |
| React shell (Vite) | Этап 1 (frontend container) |
| PostgreSQL schema + миграции + seed | Этап 2 |

Ожидаемый результат Milestone 1:

```bash
docker compose up --build
```

→ все контейнеры поднимаются; backend отдаёт healthcheck; БД создана с базовыми справочниками; frontend доступен.

## 5. Существующие файлы и каталоги

**Есть:**

- SOT v4, Implementation Plan, исходное ТЗ (reference)
- `docs/architecture/operational_discipline_assistant_flow_ru.md`
- `cursor_tasks_local/` с task 000
- `docs/cursor_sessions/` (каталог создан, пустой до этого лога)

**Отсутствует (ожидаемо на intake):**

- `.git/` — git не инициализирован
- `.gitignore`, `README.md`
- `backend/`, `frontend/`
- `docker-compose.yml`, Dockerfiles
- SQL migrations, seed scripts
- `PROJECT_STATE.md` (упоминается в operational discipline)
- Копии SOT/Plan в `docs/architecture/` (Этап 0 плана)

## 6. Что потребуется создать на следующем шаге (Milestone 1)

### Этап 0 (housekeeping, если войдёт в scope задачи M1)

- `git init`, `.gitignore`, `README.md`
- Опционально: `PROJECT_STATE.md`, копии/ссылки SOT в `docs/architecture/`

### Этап 1 — инфраструктура

- `docker-compose.yml`
- `backend/Dockerfile`, `frontend/Dockerfile`
- `.env.example` / env-конфигурация
- `frontend/` — React + Vite scaffold
- `backend/` — минимальная структура для контейнера

### Этап 2 — БД

- `backend/migrations/` или Alembic/SQL-скрипты для 13 таблиц SOT (+ `customers`, см. §7)
- Seed: `interaction_scenarios`, `sentiment_profiles`, `review_phrase_patterns`, `response_templates`, `prompt_versions` (минимум)

### Этап 3 — backend skeleton

- `app/main.py`, `app/api/`, `app/core/`, `app/db/`, `app/models/`, `app/schemas/`, `app/services/`
- `GET /health` с проверкой PostgreSQL

## 7. Противоречия и неясности

| # | Тема | Описание | Критичность |
|---|---|---|---|
| 1 | Расположение SOT/Plan | Этап 0 плана: положить SOT и Plan в `docs/architecture/`; сейчас они в корне. Task 000 запрещает перемещение. | Низкая — решить отдельной housekeeping-задачей или копированием |
| 2 | Таблица `customers` | В IMPLEMENTATION_PLAN (Этап 2) есть `customers`; в SOT §12.1 явно не описана, но `customer_id` есть в `reviews` и `service_cases`. | Средняя — добавить в миграции по логике pipeline |
| 3 | `PROJECT_STATE.md` | Operational discipline требует canonical state artifact; файла нет. | Низкая — создать при первом engineering pass |
| 4 | Имя проекта в регламенте | Operational discipline ссылается на «Assistant Flow»; рабочее имя каталога — `review-flow`. | Низкая — терминологический хвост шаблона |
| 5 | Git-репозиторий | Этап 0: «создать новый репозиторий»; `.git` отсутствует. | Низкая — часть Milestone 1 / Stage 0 |

Критических блокеров для старта Milestone 1 не выявлено.

## 8. Риски перед реализацией

1. **Scope creep** — Milestone 1 объединяет этапы 0–3; важно держать границы task-файла.
2. **Схема БД** — 13+ таблиц с FK и seed; ошибки на старте усложнят весь pipeline.
3. **Отсутствие `customers` в SOT** — риск расхождения модели с Этапом 5 (создание customer).
4. **AI provider keys** — для M1 не нужны, но env-шаблон лучше заложить сразу.
5. **Нет git** — нет версионирования до `git init`; оператору стоит инициализировать до первого commit.
6. **Два источника этапов** — нумерация «Этап N» в Plan и «Milestone N»; Milestone 1 = Этапы 0–2 + часть 3.

## 9. Рекомендация

**Статус: `ready for Milestone 1`**

Обоснование:

- SOT и Implementation Plan согласованы и достаточно детализированы для каркаса.
- Стек, контуры, schema, pipeline и роли определены.
- Противоречия некритичны и разрешимы в рамках отдельной Milestone 1 task без изменения SOT.
- Прикладной код отсутствует по замыслу intake — это ожидаемое состояние.

Условие: Milestone 1 запускать **только по отдельному task-файлу** с явным scope (как требует operational discipline).

---

## Operator commands

```bash
# Проверка структуры (выполнено агентом)
find /opt/review-flow -type f | sort

# Git status
cd /opt/review-flow && git status
# → fatal: not a git repository
```

## Git status

Репозиторий не инициализирован. Изменения intake: создан только session log в `docs/cursor_sessions/`.
