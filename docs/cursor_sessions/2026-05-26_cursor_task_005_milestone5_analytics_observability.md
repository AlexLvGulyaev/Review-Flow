# Cursor Task 005 — Milestone 5 analytics, observability and deployment readiness

## Контекст

Проект: `review-flow`.

Milestone 1 завершён:
- infrastructure;
- Docker Compose;
- PostgreSQL;
- FastAPI;
- React shell.

Milestone 2 завершён:
- review ingestion;
- phrase matching;
- AI classification;
- template selection;
- draft generation.

Milestone 3 завершён:
- operator workflow;
- moderation lifecycle;
- mock publication;
- client status page.

Milestone 4 завершён:
- prompt registry;
- prompt versions;
- active prompt switching;
- generation traceability;
- evaluation foundation.

Теперь задача — Milestone 5:

```text
analytics + observability + deployment readiness
```

Цель:
превратить проект из набора AI workflow screens
в operationally observable demo-ready platform.

---

# Главные ограничения

На этом milestone НЕ делать:

- RBAC/auth;
- async workers;
- queues;
- Redis/Celery;
- RAG/vector DB;
- embeddings;
- real external publication;
- websocket realtime;
- advanced BI dashboards;
- chart libraries;
- microservices split.

Нужен:
лёгкий operational analytics layer
и подготовка проекта к демонстрации.

---

# 1. Analytics backend

## Endpoint

Реализовать:

```text
GET /api/analytics/overview
```

---

## Метрики

Вернуть агрегаты:

### Reviews

- total_reviews
- published_reviews
- pending_reviews
- rejected_reviews
- needs_revision_reviews

### Ratings

- average_rating
- ratings_distribution

### Classification

- sentiment_distribution
- scenario_distribution
- priority_distribution

### Prompt/evaluation

- active_prompt_versions
- evaluated_cases
- average_operator_score

### Pipeline quality

- fallback_template_rate
- phrase_review_rate

---

# 2. Analytics service layer

Создать:

```text
AnalyticsService
```

или аналогичный abstraction layer.

Он должен:

- собирать агрегаты из PostgreSQL;
- быть независимым от frontend;
- возвращать typed response schema.

---

# 3. Frontend: analytics UI

Создать страницу:

```text
/analytics
```

---

## UI требования

Без heavy dashboard frameworks.

Использовать:
- cards;
- tables;
- simple lists;
- lightweight visual summaries.

---

## Блоки

### Overview

Карточки:
- total reviews;
- published;
- pending;
- rejected;
- needs revision.

### Ratings

- average rating;
- distribution table.

### Classification

- sentiments;
- scenarios;
- priorities.

### Prompt/evaluation

- active prompt versions;
- evaluated cases;
- average operator score.

### Pipeline quality

- fallback rate;
- phrase review rate.

---

# 4. Observability API

## Endpoint

```text
GET /api/logs
```

---

## Query params

Минимально:

- event_type
- review_id
- limit

---

## Возвращать

- timestamp
- event_type
- review_id
- message
- latency_ms
- metadata

---

# 5. Frontend: logs page

Создать:

```text
/logs
```

---

## UI

Показать:

- timeline-like events list;
- event_type badge;
- review_id;
- timestamp;
- metadata preview.

---

## Filters

Минимально:
- event type;
- review id.

---

# 6. Latency tracking

Добавить latency tracking для:

- review ingestion;
- phrase matching;
- classification;
- template selection;
- generation;
- moderation.

---

## Storage

Использовать existing operational logs.

Добавить:

```text
latency_ms
```

если поле ещё отсутствует.

---

# 7. Deployment readiness

## Проверить

- docker compose up --build -d
- backend startup
- frontend startup
- PostgreSQL persistence
- migrations apply automatically
- env handling
- frontend/backend connectivity

---

## Добавить

### `.env.example`

Минимальные env:

```text
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
DATABASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=
```

---

# 8. README improvement

Обновить README.

Добавить:

- project overview;
- architecture;
- stack;
- setup;
- local run;
- routes;
- screenshots placeholders;
- demo workflow;
- operational lifecycle;
- prompt management;
- analytics;
- evaluation foundation.

---

# 9. Demo scenarios document

Создать:

```text
docs/demo_scenarios.md
```

---

## Сценарии

Минимально:

1. Client review submission
2. AI classification
3. Operator moderation
4. Mock publication
5. Prompt version activation
6. Evaluation case scoring
7. Analytics overview
8. Operational logs review

---

# 10. User guide

Создать:

```text
docs/user_guide.md
```

---

## Разделы

- Client flow
- Operator flow
- Prompt management
- Evaluation
- Analytics
- Logs
- Troubleshooting basics

---

# 11. Operational logs

Добавить события:

- analytics_overview_requested
- logs_view_opened
- deployment_health_checked

---

# 12. Verification

Проверить:

1. analytics endpoint работает;
2. analytics UI показывает реальные данные;
3. logs endpoint работает;
4. logs UI работает;
5. latency записывается;
6. README обновлён;
7. docs созданы;
8. docker compose работает с clean rebuild;
9. `.env.example` присутствует.

---

# Что НЕ делать

Не реализовывать:

- auth;
- RBAC;
- async jobs;
- queues;
- charts libraries;
- websocket streams;
- RAG;
- embeddings;
- real integrations;
- export subsystem.

---

# Архитектурная цель milestone

К концу Milestone 5 проект должен выглядеть как:

```text
operational AI review workflow platform
```

с:

- controllable AI layer;
- moderation lifecycle;
- analytics;
- observability;
- deployment readiness;
- portfolio/demo readiness.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_005_milestone5_analytics_observability.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- analytics implementation;
- observability implementation;
- latency tracking;
- deployment readiness;
- docs updates;
- verification;
- проблемы;
- TODO для Milestone 6.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_005_milestone5_analytics_observability.md
Status: Milestone 5 completed
```

или:

```text
Status: Milestone 5 blocked
Reason: ...
```

---

# Результат выполнения (Cursor, 2026-05-26)

## Analytics

- `AnalyticsService` + `GET /api/analytics/overview`
- Метрики: reviews, ratings, classification distributions, active prompts, evaluation, fallback/phrase rates
- UI: `/analytics` (cards + tables)

## Observability

- `GET /api/logs` — filters: `event_type`, `review_id`, `limit`
- `LogsService` → timestamp, event_type, review_id, message, latency_ms, metadata
- UI: `/logs` (timeline + filters)
- Migration `004`: `operational_logs.metadata` JSONB

## Latency tracking

Записывается в `operational_logs.latency_ms` + metadata:

| Step | event_type |
|------|------------|
| Ingestion | review_received |
| Phrase match | phrase_matching_completed |
| Classification | classification_completed |
| Template | template_selected |
| Generation | draft_generated |
| Moderation | moderation_approved / rejected / revision |
| Health | deployment_health_checked |

## Deployment readiness

- `.env.example` обновлён
- README расширен (overview, architecture, routes, lifecycle)
- `docs/demo_scenarios.md`, `docs/user_guide.md`
- Migrations auto-apply on backend startup
- `docker compose up --build -d` verified

## Operational logs (новые)

- `analytics_overview_requested`
- `logs_view_opened`
- `deployment_health_checked`

## Verification

- [x] analytics endpoint + UI
- [x] logs endpoint + UI
- [x] latency/metadata в pipeline logs
- [x] README + docs
- [x] docker compose healthy rebuild

## TODO Milestone 6

- Auth/RBAC (out of scope MVP)
- Export reports
- Chart visualizations (optional)
- VPS deployment guide expansion

## Operator commands

```bash
docker compose up --build -d
curl http://localhost:8700/api/analytics/overview
curl "http://localhost:8700/api/logs?limit=20"
open http://localhost:5180/analytics
open http://localhost:5180/logs
```
