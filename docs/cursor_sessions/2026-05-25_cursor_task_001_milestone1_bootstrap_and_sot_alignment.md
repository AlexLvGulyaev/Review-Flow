# Cursor Task 001 — Milestone 1 bootstrap and SOT alignment

## Контекст

Проект: `review-flow`

Ты продолжаешь работу после intake-task 000.

SOT и Implementation Plan согласованы.

Текущая задача — начать реализацию Milestone 1:

- repository bootstrap;
- Docker Compose;
- PostgreSQL;
- FastAPI skeleton;
- React shell;
- migrations;
- seed data;
- healthcheck.

Важно:

- не уходить в расширение scope;
- не тащить код Assistant Flow;
- не добавлять RAG;
- не добавлять очереди;
- не добавлять Kubernetes;
- не строить premature abstractions.

Assistant Flow можно использовать только как reference architecture для:

- структуры каталогов;
- Docker-паттернов;
- healthcheck;
- env discipline;
- operational style.

Не копировать код и не переносить retrieval/RAG-компоненты.

---

# Важное изменение перед Milestone 1

Нужно устранить одно архитектурное расхождение.

В SOT используются:

- `customer_id`;
- сущность `customer`;
- связи `customer -> service_case -> review`.

Но таблица `customers` не описана в разделе PostgreSQL schema.

Это нужно исправить.

## Задача по SOT

Перед началом engineering bootstrap:

1. Обновить файл:

```text
Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
```

2. Добавить полноценное описание таблицы:

```text
customers
```

в раздел:

```text
## 12. PostgreSQL schema
```

3. Таблица должна быть согласована:

- с pipeline;
- с service_cases;
- с reviews;
- с human-in-the-loop моделью.

4. Не придумывать enterprise CRM.

Нужна минимальная operational сущность клиента.

Ожидаемый состав полей:

- id;
- customer_external_id;
- customer_name;
- email;
- phone;
- customer_segment;
- created_at;
- updated_at;
- metadata.

Можно скорректировать состав, если это необходимо для согласованности модели.

5. После обновления SOT продолжить Milestone 1.

---

# Основная задача — Milestone 1

## Что нужно реализовать

### 1. Git bootstrap

Если git ещё не инициализирован:

- выполнить `git init`;
- создать `.gitignore`.

`.gitignore` должен покрывать:

- Python;
- Node.js;
- Docker;
- env files;
- IDE artifacts;
- logs;
- build artifacts.

---

### 2. README

Создать минимальный:

```text
README.md
```

Пока без маркетинга.

Кратко зафиксировать:

- назначение проекта;
- стек;
- как запускать.

---

### 3. Repository structure

Создать минимальную структуру:

```text
backend/
frontend/
docs/
infra/
```

Не создавать лишние каталоги.

---

### 4. Docker Compose

Создать:

```text
docker-compose.yml
```

Сервисы:

- backend;
- frontend;
- postgres.

Требования:

- нормальные container names;
- healthcheck для postgres;
- backend должен ждать postgres;
- минимальные volumes;
- без nginx;
- без traefik;
- без production-hardening.

Это локальный development contour.

---

### 5. PostgreSQL

Настроить:

- postgres container;
- volume persistence;
- env configuration.

Создать:

- migrations structure;
- initial schema migration.

Нужно реализовать:

- все основные таблицы из SOT;
- включая `customers`.

---

### 6. Seed data

Добавить минимальные seed data:

- interaction_scenarios;
- sentiment_profiles;
- несколько review_phrase_patterns;
- несколько response_templates;
- базовую prompt_version.

Не создавать огромные datasets.

---

### 7. FastAPI skeleton

Создать минимальный backend:

```text
backend/app/
```

Минимальная структура:

```text
app/main.py
app/api/
app/core/
app/db/
app/models/
app/schemas/
app/services/
```

Требования:

- PostgreSQL connection;
- `/health` endpoint;
- healthcheck должен проверять БД;
- базовая обработка ошибок.

Не реализовывать pipeline.

---

### 8. Frontend shell

Создать React + Vite shell.

Требования:

- frontend container запускается;
- базовая страница открывается;
- без UI framework;
- без сложной архитектуры;
- без auth.

Достаточно:

```text
Review Flow
Milestone 1 bootstrap completed
```

---

# Что НЕ делать

Не реализовывать:

- phrase matching;
- classification;
- generation;
- moderation UI;
- prompt editor;
- analytics;
- RBAC;
- marketplace integrations;
- async workers;
- Redis;
- Celery;
- queues;
- observability UI.

---

# Сессионный лог

Создать новый session log:

```text
docs/cursor_sessions/2026-05-25_cursor_task_001_milestone1_bootstrap_and_sot_alignment.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- какие файлы созданы;
- какие migrations созданы;
- какие env используются;
- как запускать проект;
- какие решения были приняты;
- какие проблемы возникли;
- какие TODO остались на Milestone 2.

---

# Формат ответа в чат

После выполнения:

- не пересказывать весь лог;
- указать путь session log;
- указать статус:

```text
Milestone 1 completed
```

или

---

# Результат выполнения (Cursor, 2026-05-25)

## SOT alignment

Обновлён `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`: в §12.1 добавлена таблица `customers` (перед `reviews`) с полями id, customer_external_id, customer_name, email, phone, customer_segment, created_at, updated_at, metadata.

## Созданные файлы

| Категория | Файлы |
|---|---|
| Root | `.gitignore`, `.env.example`, `README.md`, `docker-compose.yml` |
| Backend | `backend/Dockerfile`, `backend/requirements.txt`, `backend/app/**` |
| Frontend | `frontend/Dockerfile`, `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/src/**` |
| Infra | `infra/db/migrations/001_initial_schema.sql`, `infra/db/migrations/002_seed_data.sql` |
| Git | `git init` выполнен |

## Migrations

| Файл | Содержание |
|---|---|
| `001_initial_schema.sql` | 14 таблиц: customers, service_cases, reviews, interaction_scenarios, sentiment_profiles, review_phrase_patterns, response_templates, review_classifications, review_responses, prompt_versions, evaluation_runs, evaluation_results, review_analytics, operational_logs |
| `002_seed_data.sql` | 4 scenarios, 4 sentiments, 4 phrases, 4 templates, 1 prompt v1.0.0 (active) |

Применение: монтирование в `/docker-entrypoint-initdb.d/` при первом старте postgres volume.

## Environment variables

| Переменная | Назначение | Default |
|---|---|---|
| `POSTGRES_USER` | DB user | reviewflow |
| `POSTGRES_PASSWORD` | DB password | reviewflow |
| `POSTGRES_DB` | DB name | reviewflow |
| `DATABASE_URL` | Backend connection | postgresql://reviewflow:reviewflow@postgres:5432/reviewflow |
| `BACKEND_HOST` / `BACKEND_PORT` | Uvicorn bind | 0.0.0.0:8000 |
| `VITE_API_URL` | Frontend API (reserved) | http://localhost:8000 |

Файл `.env` создан из `.env.example` (не коммитится).

## Запуск

```bash
cp .env.example .env
docker compose up --build
```

Проверка:

```bash
curl http://localhost:8000/health
# {"status":"ok","database":"connected"}

curl -I http://localhost:5173/
# HTTP 200
```

## Принятые решения

1. **Migrations via initdb** — SQL-скрипты в `infra/db/migrations/`, без Alembic на M1 (минимальный scope).
2. **psycopg2** — прямое подключение для healthcheck; ORM/models — заглушки на M2.
3. **Postgres без host port** — порты 5432/5433 на хосте заняты; доступ только через docker network (backend → postgres).
4. **Container names** — `review-flow-postgres`, `review-flow-backend`, `review-flow-frontend`.
5. **Healthchecks** — postgres `pg_isready`, backend HTTP `/health` с проверкой `SELECT 1`, frontend depends on backend healthy.
6. **UUID primary keys** — `gen_random_uuid()` для всех id.

## Проблемы

| Проблема | Решение |
|---|---|
| Порт 5432/5433 занят на хосте | Убран `ports` у postgres; внутренний доступ через compose network |
| Task file в `cursor_tasks_local/` отсутствовал | Исходник взят из `docs/cursor_sessions/cursor_task_001_milestone_1_bootstrap_and_sot_alignment.md` |

## Verification (выполнено)

- `docker compose ps` — все 3 сервиса healthy/running
- `GET /health` — `database: connected`
- Seed: 4 interaction_scenarios, prompt v1.0.0 active

## TODO для Milestone 2

- Client UI `/review` — форма отправки отзыва
- API приёма отзыва, создание customer/service_case/review
- PhraseMatchingService (базовый)
- ClassificationService + LLM integration
- TemplateSelectionService, ResponseGenerationService
- Alembic или версионирование migrations для последующих изменений схемы
- `PROJECT_STATE.md` (operational memory)
- Опционально: host port mapping для postgres (если нужен локальный psql)

## Operator commands

```bash
cd /opt/review-flow
cp .env.example .env
docker compose up --build -d
docker compose ps
curl -s http://localhost:8000/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
docker exec review-flow-postgres psql -U reviewflow -d reviewflow -c "SELECT count(*) FROM interaction_scenarios;"
git status
```

## Git status

Репозиторий инициализирован (`git init`). Файлы не закоммичены (commit не запрашивался).
