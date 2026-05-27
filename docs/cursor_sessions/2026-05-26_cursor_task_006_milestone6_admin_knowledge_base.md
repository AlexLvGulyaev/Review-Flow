# Session log: Cursor Task 006 — Milestone 6

## Исходный промпт (полный текст)

# Cursor Task 006 — Milestone 6 admin knowledge base and role separation

## Контекст

Проект: `review-flow`.

Milestone 1–5 завершены:
- infrastructure;
- review pipeline;
- moderation;
- prompt lifecycle;
- evaluation foundation;
- analytics;
- observability;
- deployment readiness.

Теперь задача — Milestone 6:

```text
admin knowledge base + role separation
```

Цель:
перевести систему от single-operator prototype
к разделённым operational contours:

- client;
- operator;
- administrator.

При этом:
без полноценной enterprise auth system.

---

# Главные ограничения

На этом milestone НЕ делать:

- OAuth;
- JWT refresh complexity;
- SSO;
- external identity providers;
- RBAC matrix engine;
- async workers;
- queues;
- websocket realtime;
- multi-tenant architecture;
- Kubernetes;
- distributed services.

Нужен:
лёгкий operational access layer
и полноценный admin knowledge base contour.

---

# 1. Simple role model

## Цель

Разделить основные UI-контуры:

- client;
- operator;
- administrator.

---

## Реализация

Допускается simplified auth approach.

Например:

- role selector;
- simple session storage;
- lightweight header-based role;
- mock login.

Не нужен production auth.

---

# 2. Backend role guards

Добавить lightweight access guards:

| Role | Access |
|---|---|
| client | review pages |
| operator | moderation pages |
| administrator | prompts/evaluation/analytics/logs/admin pages |

---

## Ограничить

### Operator only

```text
/operator/*
```

### Admin only

```text
/prompts
/evaluation
/analytics
/logs
/admin/*
```

---

# 3. Frontend role-aware navigation

Добавить role-aware navigation.

---

## Client

Показывать:
- review form;
- review status.

---

## Operator

Показывать:
- operator queue;
- moderation workflow.

---

## Administrator

Показывать:
- prompts;
- evaluation;
- analytics;
- logs;
- knowledge base pages.

---

# 4. Admin knowledge base: phrases

## Route

```text
/admin/phrases
```

---

## Возможности

- list phrases;
- create phrase;
- edit phrase;
- deactivate phrase.

---

## Поля

Минимально:

- phrase text;
- scenario;
- sentiment;
- priority;
- active flag.

---

# 5. Admin knowledge base: templates

## Route

```text
/admin/templates
```

---

## Возможности

- list templates;
- create template;
- edit template;
- deactivate template.

---

## Поля

Минимально:

- title;
- scenario;
- sentiment;
- priority;
- template body;
- fallback flag;
- active flag.

---

# 6. Admin knowledge base: scenarios

## Route

```text
/admin/scenarios
```

---

## Возможности

- list scenarios;
- create scenario;
- edit scenario;
- activate/deactivate.

---

## Поля

Минимально:

- code;
- title;
- description;
- active flag.

---

# 7. Admin knowledge base: sentiments

## Route

```text
/admin/sentiments
```

---

## Возможности

- list sentiments;
- create sentiment;
- edit sentiment;
- activate/deactivate.

---

## Поля

Минимально:

- code;
- title;
- description;
- active flag.

---

# 8. Backend admin APIs

Реализовать CRUD-style endpoints для:

```text
/api/admin/phrases
/api/admin/templates
/api/admin/scenarios
/api/admin/sentiments
```

---

## Минимально

- GET list
- GET by id
- POST create
- PATCH update

Без delete.

Использовать:
- active/inactive lifecycle.

---

# 9. Pipeline integration

Проверить:

- phrase matching использует admin-managed phrases;
- template selection использует admin-managed templates;
- classification использует active scenarios/sentiments.

---

# 10. UI requirements

## Не использовать

- heavy admin frameworks;
- complex tables libraries;
- enterprise dashboards.

---

## Использовать

- operational layout;
- readable forms;
- simple filters;
- lightweight tables/cards.

---

# 11. Operational logs

Добавить события:

- admin_phrase_created
- admin_phrase_updated
- admin_template_created
- admin_template_updated
- admin_scenario_updated
- admin_sentiment_updated
- role_access_denied

---

# 12. Verification

Проверить:

1. role separation работает;
2. client не видит admin pages;
3. operator не видит admin pages;
4. admin pages работают;
5. CRUD phrases работает;
6. CRUD templates работает;
7. scenarios/sentiments editable;
8. pipeline использует updated knowledge base;
9. operational logs пишутся.

---

# Что НЕ делать

Не реализовывать:

- production auth;
- password reset;
- external auth providers;
- JWT refresh flows;
- RBAC matrix engine;
- audit export;
- websocket notifications;
- async moderation;
- queues;
- RAG.

---

# Архитектурная цель milestone

К концу Milestone 6 проект должен выглядеть как:

```text
multi-role operational AI review platform
```

с:

- separated operational contours;
- manageable knowledge base;
- configurable templates;
- configurable phrases;
- lightweight access separation.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_006_milestone6_admin_knowledge_base.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- role model;
- access separation;
- admin CRUD pages;
- pipeline integration;
- operational logs;
- verification;
- проблемы;
- TODO для Milestone 7.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_006_milestone6_admin_knowledge_base.md
Status: Milestone 6 completed
```

или:

```text
Status: Milestone 6 blocked
Reason: ...
```

---

## Выполнение

### Role model

- Роли: `client`, `operator`, `administrator` (enum `Role` в `backend/app/core/roles.py`).
- Frontend: `RoleProvider` + `RoleSelector`, роль в `localStorage` (`review-flow-role`).
- Все защищённые запросы отправляют заголовок `X-Role` через `apiFetch` (`frontend/src/lib/api.js`).
- Без заголовка backend трактует запрос как `client`.

### Access separation

| Контур | API | Guard |
|--------|-----|-------|
| Client | `/api/reviews`, `/health` | без ограничения |
| Operator | `/api/operator/*` | `require_operator` |
| Administrator | `/api/prompts`, `/api/evaluation`, `/api/analytics`, `/api/logs`, `/api/admin/*` | `require_admin` |

- При отказе: HTTP 403 + событие `role_access_denied` в `operational_logs`.
- Frontend: `ProtectedRoute` + role-aware nav в `App.jsx` (клиент — отзыв; оператор — очередь; админ — prompts/evaluation/analytics/logs/KB).

### Admin CRUD

- `backend/app/api/admin.py`: GET list, GET by id, POST, PATCH для phrases/templates/scenarios/sentiments.
- Миграция `backend/migrations/005_milestone6_admin_kb.sql`: `is_active` для scenarios/sentiments, `description` для sentiments, `title`/`is_fallback` для templates.
- ORM: `InteractionScenario`, `SentimentProfile`, расширен `ResponseTemplate`.
- UI: `/admin/phrases`, `/admin/templates`, `/admin/scenarios`, `/admin/sentiments` — общий `AdminKbPage`.

### Pipeline integration

- `PhraseMatchingService` — активные фразы из БД (без изменений).
- `TemplateSelectionService` — приоритет шаблона с `is_fallback=true`.
- `ClassificationService` — `available_scenarios` / `available_sentiments` из активных записей KB (fallback на дефолтные списки, если таблицы пусты).

### Operational logs

- `admin_phrase_created`, `admin_phrase_updated`
- `admin_template_created`, `admin_template_updated`
- `admin_scenario_updated` (create/update)
- `admin_sentiment_updated` (create/update)
- `role_access_denied`

### Verification (2026-05-25)

```bash
docker compose up --build -d
curl http://localhost:8700/health  # ok
curl http://localhost:8700/api/prompts  # 403 (client)
curl -H "X-Role: administrator" http://localhost:8700/api/prompts  # 200
curl http://localhost:8700/api/operator/reviews  # 403
curl -H "X-Role: operator" http://localhost:8700/api/operator/reviews  # 200
POST /api/admin/phrases (administrator)  # 201
GET /api/logs?event_type=role_access_denied  # записи есть
```

API version: `0.6.0`.

### Проблемы

- Нет production auth (по заданию).
- Docker в sandbox без `all` permissions недоступен — проверка на хосте с daemon.

### TODO для Milestone 7

- Реальная аутентификация / сессии пользователей.
- Связь evaluation с автоматическими quality checks.
- Расширенный audit trail для admin KB.
- E2E-тесты role guards и admin CRUD.
